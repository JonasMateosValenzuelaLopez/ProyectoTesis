import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { normalizarRut } from '../common/validators/rut.validator';
import { MailService } from '../mail/mail.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { IdentificadorUsuarioDto } from './dto/identificador-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import {
  TipoTokenPassword,
  TokenPassword,
} from './entities/token-password.entity';

// Hash de relleno para comparar cuando el usuario no existe, así la respuesta
// tarda lo mismo y no se puede deducir qué RUT/correo están registrados.
const HASH_FALSO = bcrypt.hashSync('contraseña-inexistente', 10);

const VIGENCIA_TOKEN_MS: Record<TipoTokenPassword, number> = {
  [TipoTokenPassword.RECUPERACION]: 60 * 60 * 1000, // 1 hora
  [TipoTokenPassword.ACTIVACION]: 72 * 60 * 60 * 1000, // 3 días
};

export const RUTA_RESTABLECER_PASSWORD = '/restablecer-password';

const RESPUESTA_RECUPERACION = {
  mensaje:
    'Si los datos corresponden a una cuenta activa, te enviaremos un correo con instrucciones.',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.buscarPorIdentificador(loginDto, true);
    const passwordCorrecta = await bcrypt.compare(
      loginDto.password,
      usuario?.passwordHash ?? HASH_FALSO,
    );

    if (!usuario || !passwordCorrecta) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!usuario.estado) {
      throw new ForbiddenException(
        'Tu cuenta está desactivada. Contacta a la administración.',
      );
    }

    const comunidades = await this.comunidadesActivas(usuario.idUsuario);
    if (comunidades.length === 0) {
      throw new ForbiddenException(
        'Tu cuenta no está asociada a ninguna comunidad activa.',
      );
    }

    const payload: JwtPayload = { sub: usuario.idUsuario };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      usuario: { ...this.serializarUsuario(usuario), comunidades },
    };
  }

  async perfil(idUsuario: number) {
    const usuario = await this.usuariosRepository.findOneBy({ idUsuario });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      ...this.serializarUsuario(usuario),
      comunidades: await this.comunidadesActivas(idUsuario),
    };
  }

  // Devuelve siempre el mismo mensaje para no revelar qué RUT/correos están
  // registrados; por eso un fallo al emitir el token se registra pero no se
  // propaga (un 500 solo aparecería para cuentas que existen).
  async solicitarRecuperacion(dto: IdentificadorUsuarioDto) {
    const usuario = await this.buscarPorIdentificador(dto, false);

    if (usuario?.estado) {
      let token: string;
      try {
        token = await this.emitirTokenPassword(
          usuario.idUsuario,
          TipoTokenPassword.RECUPERACION,
        );
      } catch (error) {
        this.logger.error(
          `No se pudo emitir el token de recuperación del usuario ${usuario.idUsuario}`,
          error instanceof Error ? error.stack : String(error),
        );
        return RESPUESTA_RECUPERACION;
      }
      void this.mailService.enviar({
        para: usuario.correo,
        asunto: 'Recupera tu contraseña de EntreCasas',
        texto:
          `Hola ${usuario.nombre}:\n\n` +
          `Recibimos una solicitud para restablecer tu contraseña. ` +
          `Para crear una nueva, abre este enlace (válido por 1 hora):\n\n` +
          `${this.urlRestablecer(token)}\n\n` +
          `Si no fuiste tú, ignora este correo; tu contraseña no cambiará.`,
      });
    }

    return RESPUESTA_RECUPERACION;
  }

  // Sirve tanto para recuperar la contraseña como para activar una cuenta nueva.
  async restablecerPassword(dto: RestablecerPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.dataSource.transaction(async (manager) => {
      const token = await manager.findOneBy(TokenPassword, {
        tokenHash,
        fechaUso: IsNull(),
      });
      if (!token || token.fechaExpiracion.getTime() < Date.now()) {
        throw new BadRequestException('El enlace no es válido o ya expiró');
      }

      // El WHERE con fecha_uso IS NULL evita que el mismo token se use dos
      // veces si llegan dos peticiones a la vez.
      const ahora = new Date();
      const { affected } = await manager.update(
        TokenPassword,
        { idToken: token.idToken, fechaUso: IsNull() },
        { fechaUso: ahora },
      );
      if (affected !== 1) {
        throw new BadRequestException('El enlace no es válido o ya expiró');
      }

      await manager.update(
        Usuario,
        { idUsuario: token.idUsuario },
        { passwordHash, passwordActualizadaEn: ahora },
      );
      await manager.softDelete(TokenPassword, {
        idUsuario: token.idUsuario,
        fechaUso: IsNull(),
      });
    });

    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

  /**
   * Genera un token de un solo uso y devuelve su valor en claro (para el
   * correo). Reemplaza cualquier token previo sin usar del mismo tipo.
   * Sin `manager` abre su propia transacción: si el insert falla, los tokens
   * previos no quedan anulados.
   */
  async emitirTokenPassword(
    idUsuario: number,
    tipo: TipoTokenPassword,
    manager?: EntityManager,
  ): Promise<string> {
    if (!manager) {
      return this.dataSource.transaction((transaccion) =>
        this.emitirTokenPassword(idUsuario, tipo, transaccion),
      );
    }
    await manager.softDelete(TokenPassword, {
      idUsuario,
      tipo,
      fechaUso: IsNull(),
    });

    const token = randomBytes(32).toString('base64url');
    await manager.insert(TokenPassword, {
      idUsuario,
      tipo,
      tokenHash: this.hashToken(token),
      fechaExpiracion: new Date(Date.now() + VIGENCIA_TOKEN_MS[tipo]),
    });
    return token;
  }

  urlRestablecer(token: string): string {
    return this.mailService.urlFrontend(
      `${RUTA_RESTABLECER_PASSWORD}?token=${token}`,
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private buscarPorIdentificador(
    dto: IdentificadorUsuarioDto,
    conPassword: boolean,
  ): Promise<Usuario | null> {
    const consulta = this.usuariosRepository.createQueryBuilder('usuario');
    if (conPassword) {
      consulta.addSelect('usuario.passwordHash');
    }
    if (dto.rut) {
      consulta.where('usuario.rut = :rut', { rut: normalizarRut(dto.rut) });
    } else {
      consulta.where('usuario.correo = :correo', { correo: dto.correo });
    }
    return consulta.getOne();
  }

  private async comunidadesActivas(idUsuario: number) {
    const membresias = await this.membresiasRepository.find({
      where: { idUsuario, estado: true },
      relations: { red: true, unidad: true, roles: true },
      order: { idRed: 'ASC' },
    });
    // Una red con borrado lógico queda fuera del JOIN y llega en null, aunque
    // el tipo de la relación no lo refleje.
    const vigentes = membresias.filter((membresia) => membresia.red);
    return vigentes.map((membresia) => ({
      idRed: membresia.idRed,
      nombre: membresia.red.nombre,
      tipo: membresia.red.tipo,
      unidad: membresia.unidad
        ? {
            idUnidad: membresia.unidad.idUnidad,
            numeroIdentificador: membresia.unidad.numeroIdentificador,
            callePasaje: membresia.unidad.callePasaje,
          }
        : null,
      roles: membresia.roles.map((rol) => ({
        idRol: rol.idRol,
        nombre: rol.nombreRol,
      })),
    }));
  }

  private serializarUsuario(usuario: Usuario) {
    return {
      idUsuario: usuario.idUsuario,
      rut: usuario.rut,
      nombre: usuario.nombre,
      apellidoPaterno: usuario.apellidoPaterno,
      apellidoMaterno: usuario.apellidoMaterno,
      correo: usuario.correo,
      telefono: usuario.telefono,
    };
  }
}

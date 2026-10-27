import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente, fechaHoy } from '../common/utils/vigencia';
import { PAIS_POR_DEFECTO } from '../common/validators/identificador.validator';
import { MailService } from '../mail/mail.service';
import {
  EstadoRedVecinal,
  RedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  MAX_CODIGOS_OTP_POR_VENTANA,
  MAX_INTENTOS_CODIGO_OTP,
  MENSAJE_CODIGO_INVALIDO,
  MENSAJE_CUENTA_BLOQUEADA,
  RUTA_RESTABLECER_PASSWORD,
  VENTANA_CODIGOS_OTP_MS,
  VIGENCIA_CODIGO_OTP_MS,
} from './auth.constantes';
import { IdentificadorUsuarioDto } from './dto/identificador-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { CodigoOtp } from './entities/codigo-otp.entity';
import {
  TipoTokenPassword,
  TokenPassword,
} from './entities/token-password.entity';

const HASH_FALSO = bcrypt.hashSync('contraseña-inexistente', 10);

const VIGENCIA_TOKEN_MS: Record<TipoTokenPassword, number> = {
  [TipoTokenPassword.RECUPERACION]: 60 * 60 * 1000,
  [TipoTokenPassword.ACTIVACION]: 72 * 60 * 60 * 1000,
};

const RESPUESTA_RECUPERACION = {
  mensaje:
    'Si los datos corresponden a una cuenta activa, te enviaremos un correo con instrucciones.',
};

const RESPUESTA_CODIGO = {
  mensaje:
    'Si los datos corresponden a una cuenta activa, te enviaremos un código por correo.',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    @InjectRepository(Residencia)
    private readonly residenciasRepository: Repository<Residencia>,
    @InjectRepository(RedModulo)
    private readonly redModulosRepository: Repository<RedModulo>,
    @InjectRepository(CodigoOtp)
    private readonly codigosOtpRepository: Repository<CodigoOtp>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async login(loginDto: LoginDto) {
    const usuario = await this.buscarPorIdentificador(loginDto, true);
    const passwordCorrecta = await bcrypt.compare(
      loginDto.password,
      usuario?.passwordHash ?? HASH_FALSO,
    );
    if (!usuario?.passwordHash || !passwordCorrecta) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.iniciarSesion(usuario);
  }

  async solicitarCodigo(dto: IdentificadorUsuarioDto) {
    const usuario = await this.buscarPorIdentificador(dto, false);
    if (!usuario || usuario.bloqueado) {
      return RESPUESTA_CODIGO;
    }

    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      const emitidosEnVentana = await this.codigosOtpRepository.count({
        where: {
          idUsuario: usuario.idUsuario,
          expira: MoreThan(
            new Date(
              Date.now() - VENTANA_CODIGOS_OTP_MS + VIGENCIA_CODIGO_OTP_MS,
            ),
          ),
        },
      });
      if (emitidosEnVentana >= MAX_CODIGOS_OTP_POR_VENTANA) {
        this.logger.warn(
          `Límite de códigos de acceso alcanzado para el usuario ${usuario.idUsuario}`,
        );
        return RESPUESTA_CODIGO;
      }
      await this.dataSource.transaction(async (manager) => {
        await manager.update(
          CodigoOtp,
          { idUsuario: usuario.idUsuario, usado: false },
          { usado: true },
        );
        await manager.insert(CodigoOtp, {
          idUsuario: usuario.idUsuario,
          codigoHash: this.hashCodigoOtp(usuario.idUsuario, codigo),
          expira: new Date(Date.now() + VIGENCIA_CODIGO_OTP_MS),
        });
      });
    } catch (error) {
      this.logger.error(
        `No se pudo emitir el código de acceso del usuario ${usuario.idUsuario}`,
        error instanceof Error ? error.stack : String(error),
      );
      return RESPUESTA_CODIGO;
    }

    void this.mailService.enviar({
      para: usuario.correo,
      asunto: 'Tu código para entrar a EntreCasas',
      texto:
        `Hola ${usuario.nombre}:\n\n` +
        `Tu código para iniciar sesión es ${codigo}. Vence en 10 minutos.\n\n` +
        `Si no lo pediste, ignora este correo.`,
    });
    return RESPUESTA_CODIGO;
  }

  async verificarCodigo(dto: VerificarCodigoDto) {
    const usuario = await this.buscarPorIdentificador(dto, false);
    if (!usuario) {
      throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);
    }
    const registro = await this.codigosOtpRepository.findOne({
      where: {
        idUsuario: usuario.idUsuario,
        usado: false,
        expira: MoreThan(new Date()),
      },
      order: { idCodigo: 'DESC' },
    });
    if (!registro) {
      throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);
    }

    const { affected: descontado } = await this.codigosOtpRepository.update(
      {
        idCodigo: registro.idCodigo,
        usado: false,
        intentos: LessThan(MAX_INTENTOS_CODIGO_OTP),
      },
      { intentos: () => 'intentos + 1' },
    );
    if (descontado !== 1) {
      await this.codigosOtpRepository.update(
        { idCodigo: registro.idCodigo },
        { usado: true },
      );
      throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);
    }

    const esperado = Buffer.from(registro.codigoHash, 'hex');
    const recibido = Buffer.from(
      this.hashCodigoOtp(usuario.idUsuario, dto.codigo),
      'hex',
    );
    if (
      esperado.length !== recibido.length ||
      !timingSafeEqual(esperado, recibido)
    ) {
      throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);
    }
    const { affected: consumido } = await this.codigosOtpRepository.update(
      { idCodigo: registro.idCodigo, usado: false },
      { usado: true },
    );
    if (consumido !== 1) {
      throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);
    }
    return this.iniciarSesion(usuario);
  }

  async perfil(idUsuario: number) {
    const usuario = await this.usuariosRepository.findOneBy({ idUsuario });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { activas } = await this.comunidadesDe(idUsuario);
    return { ...this.serializarUsuario(usuario), comunidades: activas };
  }

  async solicitarRecuperacion(dto: IdentificadorUsuarioDto) {
    const usuario = await this.buscarPorIdentificador(dto, false);

    if (usuario && !usuario.bloqueado) {
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

      const ahora = new Date();
      const { affected } = await manager.update(
        TokenPassword,
        { idToken: token.idToken, fechaUso: IsNull() },
        { fechaUso: ahora },
      );
      if (affected !== 1) {
        throw new BadRequestException('El enlace no es válido o ya expiró');
      }

      const { affected: actualizado } = await manager.update(
        Usuario,
        { idUsuario: token.idUsuario, fechaEliminacion: IsNull() },
        { passwordHash, passwordActualizadaEn: ahora },
      );
      if (actualizado !== 1) {
        throw new BadRequestException('El enlace no es válido o ya expiró');
      }
      await manager.softDelete(TokenPassword, {
        idUsuario: token.idUsuario,
        fechaUso: IsNull(),
      });
    });

    return { mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' };
  }

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

  private async iniciarSesion(usuario: Usuario) {
    if (usuario.bloqueado) {
      throw new ForbiddenException(MENSAJE_CUENTA_BLOQUEADA);
    }

    const { activas, suspendidas } = await this.comunidadesDe(
      usuario.idUsuario,
    );
    if (!usuario.esPlataforma && activas.length === 0) {
      const [suspendida] = suspendidas;
      throw new ForbiddenException(
        suspendida
          ? `Tu comunidad ${suspendida.nombre} está suspendida` +
              (suspendida.motivoSuspension
                ? `: ${suspendida.motivoSuspension}`
                : '.')
          : 'Tu cuenta no está asociada a ninguna comunidad activa.',
      );
    }

    const payload: JwtPayload = { sub: usuario.idUsuario };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      usuario: { ...this.serializarUsuario(usuario), comunidades: activas },
    };
  }

  private hashCodigoOtp(idUsuario: number, codigo: string): string {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('JWT_SECRET'),
    )
      .update(`${idUsuario}:${codigo}`)
      .digest('hex');
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
    if (dto.identificador) {
      consulta.where(
        'usuario.pais = :pais AND usuario.identificador = :identificador',
        {
          pais: dto.pais ?? PAIS_POR_DEFECTO,
          identificador: dto.identificador,
        },
      );
    } else {
      consulta.where('usuario.correo = :correo', { correo: dto.correo });
    }
    return consulta.getOne();
  }

  private async comunidadesDe(idUsuario: number) {
    const hoy = fechaHoy();
    const membresias = await this.membresiasRepository.find({
      where: { idUsuario, activo: true, ...condicionVigente(hoy) },
      relations: { red: true, rol: true },
      order: { idRed: 'ASC', idRol: 'ASC' },
    });
    const porRed = new Map<number, { red: RedVecinal; cargos: Membresia[] }>();
    for (const membresia of membresias.filter((m) => m.red && m.rol)) {
      const grupo = porRed.get(membresia.idRed) ?? {
        red: membresia.red,
        cargos: [],
      };
      grupo.cargos.push(membresia);
      porRed.set(membresia.idRed, grupo);
    }

    const grupos = [...porRed.values()];
    const suspendidas = grupos
      .filter(({ red }) => red.estado === EstadoRedVecinal.SUSPENDIDA)
      .map(({ red }) => red);
    const activos = grupos.filter(
      ({ red }) => red.estado === EstadoRedVecinal.ACTIVA,
    );
    if (activos.length === 0) {
      return { activas: [], suspendidas };
    }

    const idsRedes = activos.map(({ red }) => red.idRed);
    const [modulos, residencias] = await Promise.all([
      this.redModulosRepository.find({
        where: { idRed: In(idsRedes), activo: true },
      }),
      this.residenciasRepository.find({
        where: { idUsuario, ...condicionVigente(hoy) },
        relations: { unidad: true },
      }),
    ]);

    const activas = activos.map(({ red, cargos }) => {
      const modulosRed = modulos
        .filter((m) => m.idRed === red.idRed)
        .map((m) => m.codigoModulo);
      return {
        idRed: red.idRed,
        nombre: red.nombre,
        tipo: red.tipo,
        roles: cargos.map((m) => ({ idRol: m.idRol, nombre: m.rol.nombreRol })),
        presidenteAdministra:
          cargos.some((m) => m.idRol === RolUsuario.PRESIDENTE) &&
          !modulosRed.includes(CodigoModulo.ADMINISTRADOR_EXTERNO),
        modulos: modulosRed,
        unidades: residencias
          .filter((r) => r.unidad && r.unidad.idRed === red.idRed)
          .map((r) => ({
            idUnidad: r.unidad.idUnidad,
            numeroIdentificador: r.unidad.numeroIdentificador,
            tipoUnidad: r.unidad.tipo,
            tipoResidencia: r.tipo,
          })),
      };
    });
    return { activas, suspendidas };
  }

  private serializarUsuario(usuario: Usuario) {
    return {
      idUsuario: usuario.idUsuario,
      identificador: usuario.identificador,
      pais: usuario.pais,
      nombre: usuario.nombre,
      apellidoPaterno: usuario.apellidoPaterno,
      apellidoMaterno: usuario.apellidoMaterno,
      correo: usuario.correo,
      telefono: usuario.telefono,
      esPlataforma: usuario.esPlataforma,
    };
  }
}

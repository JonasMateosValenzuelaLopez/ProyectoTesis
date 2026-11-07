import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';
import {
  DataSource,
  IsNull,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  Not,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { CodigoError } from '../common/errores/codigo-error.enum';
import { enmascararCorreo } from '../common/utils/correo';
import { CorreoSaliente, MailService } from '../mail/mail.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  MAX_CODIGOS_OTP_POR_VENTANA,
  MAX_INTENTOS_CODIGO_OTP,
  MENSAJE_CODIGO_INVALIDO,
  VENTANA_CODIGOS_OTP_MS,
  VIGENCIA_CODIGO_OTP_MS,
} from './auth.constantes';
import { AuthService } from './auth.service';
import {
  ActualizarTelefonoDto,
  CambiarPasswordDto,
  ConfirmarCambioCorreoDto,
  MENSAJE_PASSWORD_ACTUAL_INCORRECTA,
  SolicitarCambioCorreoDto,
} from './dto/mis-datos.dto';
import { CambioCorreo } from './entities/cambio-correo.entity';
import { CodigoOtp } from './entities/codigo-otp.entity';
import { TokenPassword } from './entities/token-password.entity';

export const MENSAJE_CODIGO_CORREO_ENVIADO =
  'Si el correo está disponible, te enviamos un código de 6 dígitos. Vence en 10 minutos.';

export const MENSAJE_CORREO_NO_DISPONIBLE =
  'Ese correo ya no está disponible. Pide un código para otro correo';

export const MENSAJE_CUENTA_SIN_PASSWORD =
  'Tu cuenta aún no tiene contraseña. Créala con «Olvidé mi contraseña» en la pantalla de ingreso';

export const MENSAJE_PASSWORD_REPETIDA =
  'La nueva contraseña debe ser distinta de la actual';

export const MENSAJE_PASSWORD_CAMBIO_EN_CURSO =
  'Tu contraseña cambió mientras tanto. Intenta de nuevo';

export interface PedidoCambioCorreo {
  mensaje: string;
  expiraEn: Date;
}

export type PerfilCuenta = Awaited<ReturnType<AuthService['perfil']>>;

export type SesionRenovada = Awaited<ReturnType<AuthService['nuevaSesion']>>;

@Injectable()
export class MisDatosService {
  private readonly logger = new Logger(MisDatosService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(CambioCorreo)
    private readonly cambiosRepository: Repository<CambioCorreo>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
  ) {}

  async actualizarTelefono(
    idUsuario: number,
    dto: ActualizarTelefonoDto,
  ): Promise<PerfilCuenta> {
    const { affected } = await this.usuariosRepository.update(
      { idUsuario, fechaEliminacion: IsNull() },
      { telefono: dto.telefono },
    );
    if (!affected) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.authService.perfil(idUsuario);
  }

  async solicitarCambioCorreo(
    idUsuario: number,
    dto: SolicitarCambioCorreoDto,
  ): Promise<PedidoCambioCorreo> {
    const codigo = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expira = new Date(Date.now() + VIGENCIA_CODIGO_OTP_MS);
    const { nombre, ocupado } = await this.dataSource.transaction(
      async (manager) => {
        const usuario = await manager.findOne(Usuario, {
          where: { idUsuario },
          lock: { mode: 'pessimistic_write' },
        });
        if (!usuario) {
          throw new NotFoundException('Usuario no encontrado');
        }
        if (usuario.correo.toLowerCase() === dto.correo) {
          throw new BadRequestException({
            message: 'Ese ya es el correo de tu cuenta',
            campos: { correo: 'Ese ya es el correo de tu cuenta' },
          });
        }
        const pedidos = await manager.count(CambioCorreo, {
          where: {
            idUsuario,
            fechaCreacion: MoreThan(
              new Date(Date.now() - VENTANA_CODIGOS_OTP_MS),
            ),
          },
          withDeleted: true,
        });
        if (pedidos >= MAX_CODIGOS_OTP_POR_VENTANA) {
          throw new HttpException(
            {
              codigo: CodigoError.DEMASIADAS_SOLICITUDES,
              message:
                'Pediste varios códigos seguidos. Espera unos minutos e intenta de nuevo',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        const ocupado = await manager.exists(Usuario, {
          where: { correo: dto.correo, idUsuario: Not(idUsuario) },
          withDeleted: true,
        });
        await manager.update(
          CambioCorreo,
          { idUsuario, usado: false },
          { usado: true, correoNuevo: null },
        );
        await manager.insert(
          CambioCorreo,
          ocupado
            ? {
                idUsuario,
                correoNuevo: null,
                codigoHash: randomBytes(32).toString('hex'),
                expira,
                usado: true,
              }
            : {
                idUsuario,
                correoNuevo: dto.correo,
                codigoHash: this.hash(idUsuario, dto.correo, codigo),
                expira,
              },
        );
        return { nombre: usuario.nombre, ocupado };
      },
    );
    if (ocupado) {
      this.logger.warn(
        `El usuario ${idUsuario} pidió cambiar su correo a uno ya registrado; no se envió código`,
      );
    } else {
      this.enviarEnSegundoPlano(idUsuario, {
        para: dto.correo,
        asunto: 'Confirma tu nuevo correo en EntreCasas',
        texto:
          `Hola ${nombre}:\n\n` +
          `Pediste usar este correo en tu cuenta de EntreCasas. Tu código de confirmación es ${codigo} y vence en 10 minutos.\n\n` +
          `Mientras no lo ingreses, tu cuenta sigue con el correo anterior. Si no lo pediste, ignora este mensaje: no se hará ningún cambio.`,
      });
    }
    return { mensaje: MENSAJE_CODIGO_CORREO_ENVIADO, expiraEn: expira };
  }

  async confirmarCambioCorreo(
    idUsuario: number,
    dto: ConfirmarCambioCorreoDto,
  ): Promise<PerfilCuenta> {
    const registro = await this.cambiosRepository.findOne({
      where: { idUsuario, usado: false, expira: MoreThan(new Date()) },
      order: { idCambio: 'DESC' },
    });
    if (!registro?.correoNuevo) {
      throw this.codigoInvalido();
    }
    const { affected: descontado } = await this.cambiosRepository.update(
      {
        idCambio: registro.idCambio,
        usado: false,
        intentos: LessThan(MAX_INTENTOS_CODIGO_OTP),
      },
      { intentos: () => 'intentos + 1' },
    );
    if (descontado !== 1) {
      await this.anular(registro.idCambio);
      throw this.codigoInvalido();
    }
    const correoNuevo = registro.correoNuevo;
    if (
      !this.coincide(registro.codigoHash, idUsuario, correoNuevo, dto.codigo)
    ) {
      if (registro.intentos + 1 >= MAX_INTENTOS_CODIGO_OTP) {
        await this.anular(registro.idCambio);
      }
      throw this.codigoInvalido();
    }
    const ocupado = await this.usuariosRepository.exists({
      where: { correo: correoNuevo, idUsuario: Not(idUsuario) },
      withDeleted: true,
    });
    if (ocupado) {
      await this.anular(registro.idCambio);
      throw new ConflictException(MENSAJE_CORREO_NO_DISPONIBLE);
    }
    const ahora = new Date();
    const cuenta = await this.dataSource
      .transaction(async (manager) => {
        const usuario = await manager.findOne(Usuario, {
          where: { idUsuario },
          lock: { mode: 'pessimistic_write' },
        });
        if (!usuario) {
          throw new NotFoundException('Usuario no encontrado');
        }
        const { affected } = await manager.update(
          CambioCorreo,
          { idCambio: registro.idCambio, usado: false },
          { usado: true, confirmadoEn: ahora, correoNuevo: null },
        );
        if (affected !== 1) {
          throw this.codigoInvalido();
        }
        await manager.update(Usuario, { idUsuario }, { correo: correoNuevo });
        await manager.update(
          CodigoOtp,
          { idUsuario, usado: false },
          { usado: true },
        );
        await manager.update(
          TokenPassword,
          { idUsuario, fechaUso: IsNull() },
          { fechaUso: ahora },
        );
        return { correoAnterior: usuario.correo, nombre: usuario.nombre };
      })
      .catch(async (error: unknown) => {
        if (this.esCorreoDuplicado(error)) {
          await this.anular(registro.idCambio);
          throw new ConflictException(MENSAJE_CORREO_NO_DISPONIBLE);
        }
        throw error;
      });
    this.enviarEnSegundoPlano(idUsuario, {
      para: cuenta.correoAnterior,
      asunto: 'El correo de tu cuenta EntreCasas cambió',
      texto:
        `Hola ${cuenta.nombre}:\n\n` +
        `El correo de tu cuenta de EntreCasas se cambió a ${enmascararCorreo(correoNuevo)}. Desde ahora los códigos de ingreso y los avisos llegarán a esa dirección, y los códigos o enlaces que te enviamos antes a este correo ya no sirven.\n\n` +
        `Si no fuiste tú, avisa de inmediato a la administración de tu comunidad o al equipo EntreCasas.`,
    });
    this.enviarEnSegundoPlano(idUsuario, {
      para: correoNuevo,
      asunto: 'Tu correo en EntreCasas quedó actualizado',
      texto:
        `Hola ${cuenta.nombre}:\n\n` +
        `Desde ahora este es el correo de tu cuenta de EntreCasas. Aquí recibirás los códigos de ingreso y los avisos de tu comunidad.`,
    });
    return this.authService.perfil(idUsuario);
  }

  async cambiarPassword(
    idUsuario: number,
    dto: CambiarPasswordDto,
  ): Promise<SesionRenovada> {
    const usuario = await this.usuariosRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.idUsuario = :idUsuario', { idUsuario })
      .getOne();
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const passwordAnterior = usuario.passwordHash;
    if (!passwordAnterior) {
      throw new BadRequestException({
        message: MENSAJE_CUENTA_SIN_PASSWORD,
        campos: { passwordActual: MENSAJE_CUENTA_SIN_PASSWORD },
      });
    }
    if (!(await bcrypt.compare(dto.passwordActual, passwordAnterior))) {
      this.logger.warn(
        `El usuario ${idUsuario} intentó cambiar su contraseña con la contraseña actual incorrecta`,
      );
      throw new BadRequestException({
        message: MENSAJE_PASSWORD_ACTUAL_INCORRECTA,
        campos: { passwordActual: MENSAJE_PASSWORD_ACTUAL_INCORRECTA },
      });
    }
    if (await bcrypt.compare(dto.passwordNueva, passwordAnterior)) {
      throw new BadRequestException({
        message: MENSAJE_PASSWORD_REPETIDA,
        campos: { passwordNueva: MENSAJE_PASSWORD_REPETIDA },
      });
    }
    const passwordHash = await bcrypt.hash(dto.passwordNueva, 10);
    const ahora = new Date(Math.floor(Date.now() / 1000) * 1000);
    await this.dataSource.transaction(async (manager) => {
      const { affected } = await manager.update(
        Usuario,
        {
          idUsuario,
          passwordHash: passwordAnterior,
          fechaEliminacion: IsNull(),
        },
        { passwordHash, passwordActualizadaEn: ahora },
      );
      if (affected !== 1) {
        throw new ConflictException(MENSAJE_PASSWORD_CAMBIO_EN_CURSO);
      }
      await manager.softDelete(TokenPassword, {
        idUsuario,
        fechaUso: IsNull(),
      });
    });
    this.enviarEnSegundoPlano(idUsuario, {
      para: usuario.correo,
      asunto: 'Tu contraseña de EntreCasas cambió',
      texto:
        `Hola ${usuario.nombre}:\n\n` +
        `La contraseña de tu cuenta de EntreCasas se cambió desde una sesión iniciada. Por seguridad, cerramos la sesión en tus otros dispositivos.\n\n` +
        `Si no fuiste tú, crea una nueva con «Olvidé mi contraseña» en la pantalla de ingreso y avisa a la administración de tu comunidad o al equipo EntreCasas.`,
    });
    return this.authService.nuevaSesion(idUsuario);
  }

  async anularVencidos(): Promise<number> {
    const { affected } = await this.cambiosRepository.update(
      { usado: false, expira: LessThanOrEqual(new Date()) },
      { usado: true, correoNuevo: null },
    );
    return affected ?? 0;
  }

  private enviarEnSegundoPlano(idUsuario: number, correo: CorreoSaliente) {
    this.mailService.enviar(correo).then(
      (enviado) => {
        if (!enviado) {
          this.logger.error(
            `No se entregó el correo "${correo.asunto}" del usuario ${idUsuario}`,
          );
        }
      },
      (error: unknown) => {
        this.logger.error(
          `Falló el envío del correo "${correo.asunto}" del usuario ${idUsuario}`,
          error instanceof Error ? error.stack : String(error),
        );
      },
    );
  }

  private coincide(
    codigoHash: string,
    idUsuario: number,
    correo: string,
    codigo: string,
  ) {
    const esperado = Buffer.from(codigoHash, 'hex');
    const recibido = Buffer.from(this.hash(idUsuario, correo, codigo), 'hex');
    return (
      esperado.length === recibido.length && timingSafeEqual(esperado, recibido)
    );
  }

  private esCorreoDuplicado(error: unknown) {
    return (
      error instanceof QueryFailedError &&
      (error as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  private codigoInvalido() {
    return new BadRequestException({
      message: MENSAJE_CODIGO_INVALIDO,
      campos: { codigo: MENSAJE_CODIGO_INVALIDO },
    });
  }

  private anular(idCambio: number) {
    return this.cambiosRepository.update(
      { idCambio },
      { usado: true, correoNuevo: null },
    );
  }

  private hash(idUsuario: number, correo: string, codigo: string) {
    return createHmac(
      'sha256',
      this.configService.getOrThrow<string>('JWT_SECRET'),
    )
      .update(`cambio-correo:${idUsuario}:${correo}:${codigo}`)
      .digest('hex');
  }
}

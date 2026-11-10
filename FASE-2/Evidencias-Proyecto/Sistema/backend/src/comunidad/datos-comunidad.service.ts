import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, Not } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { CorreoSaliente } from '../mail/mail.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  CambiarUmbralVisadoDto,
  GuardarDatosComunidadDto,
} from './dto/datos-comunidad.dto';

export const LECTORES_DATOS_COMUNIDAD = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.PRESIDENTE,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
];

export const AVISADOS_CAMBIO_CUENTA = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.PRESIDENTE,
  RolUsuario.TESORERO,
];

const CAMPOS_CUENTA = [
  'banco',
  'tipoCuenta',
  'numeroCuenta',
  'titularCuenta',
  'identificadorTitular',
] as const;

const CAMPOS_TRANSFERENCIA = [
  ...CAMPOS_CUENTA,
  'correoTransferencias',
] as const;

const CAMPOS_EDITABLES = [
  'nombre',
  'direccion',
  ...CAMPOS_TRANSFERENCIA,
] as const;

type CampoEditable = (typeof CAMPOS_EDITABLES)[number];

type CamposEditables = { [K in CampoEditable]: RedVecinal[K] };

const FALTA_CAMPO: Record<(typeof CAMPOS_CUENTA)[number], string> = {
  banco: 'Indica el banco',
  tipoCuenta: 'Indica el tipo de cuenta',
  numeroCuenta: 'Indica el número de cuenta',
  titularCuenta: 'Indica el titular de la cuenta',
  identificadorTitular: 'Indica el RUT del titular',
};

export const MENSAJE_CUENTA_INCOMPLETA =
  'Para que los residentes puedan transferir, completa el banco, el tipo de cuenta, el número, el titular y su RUT. Si no quieres mostrar una cuenta, deja todos los datos vacíos';

export function enmascararCuenta(numero: string | null): string | null {
  if (!numero) {
    return null;
  }
  return `terminada en ${numero.replace(/\D/g, '').slice(-4)}`;
}

@Injectable()
export class DatosComunidadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly correosService: CorreosComunidadService,
  ) {}

  async obtener(red: ContextoRed) {
    const comunidad = await this.dataSource.manager.findOne(RedVecinal, {
      where: { idRed: red.idRed },
    });
    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }
    return this.serializar(comunidad);
  }

  async guardar(
    red: ContextoRed,
    idUsuario: number,
    dto: GuardarDatosComunidadDto,
  ) {
    const campos = this.camposEditables(dto);
    this.validarCuentaCompleta(campos);

    const resultado = await this.dataSource.transaction(async (manager) => {
      const actual = await this.bloquear(manager, red.idRed);
      const cambiados = CAMPOS_EDITABLES.filter(
        (campo) => actual[campo] !== campos[campo],
      );
      if (cambiados.length === 0) {
        return null;
      }
      await manager.update(RedVecinal, { idRed: red.idRed }, campos);

      const cambioCuenta = cambiados.some((campo) =>
        (CAMPOS_TRANSFERENCIA as readonly string[]).includes(campo),
      );
      const cuenta = cambioCuenta
        ? {
            cuentaAnterior: enmascararCuenta(actual.numeroCuenta),
            cuentaNueva: enmascararCuenta(campos.numeroCuenta),
          }
        : {};
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: 'actualizar_datos_comunidad',
          entidad: 'redes_vecinales',
          idEntidad: red.idRed,
          detalle: { campos: cambiados, ...cuenta },
        },
        manager,
      );
      const avisos = cambioCuenta
        ? await this.avisosCambioCuenta(manager, red.idRed, idUsuario, {
            comunidad: campos.nombre,
            anterior: actual,
            nueva: campos,
          })
        : [];
      return { avisos };
    });

    if (resultado) {
      await this.bitacoraService.marcarActividad(red.idRed);
      if (resultado.avisos.length) {
        this.correosService.enviarEnSegundoPlano(resultado.avisos);
      }
    }
    return this.obtener(red);
  }

  async cambiarUmbralVisado(
    red: ContextoRed,
    idUsuario: number,
    dto: CambiarUmbralVisadoDto,
  ) {
    const cambiado = await this.dataSource.transaction(async (manager) => {
      const actual = await this.bloquear(manager, red.idRed);
      if (actual.umbralVisado === dto.umbralVisado) {
        return false;
      }
      await manager.update(
        RedVecinal,
        { idRed: red.idRed },
        { umbralVisado: dto.umbralVisado },
      );
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: 'cambiar_umbral_visado',
          entidad: 'redes_vecinales',
          idEntidad: red.idRed,
          detalle: { anterior: actual.umbralVisado, nuevo: dto.umbralVisado },
        },
        manager,
      );
      return true;
    });

    if (cambiado) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    return this.obtener(red);
  }

  private async bloquear(manager: EntityManager, idRed: number) {
    const comunidad = await manager.findOne(RedVecinal, {
      where: { idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }
    return comunidad;
  }

  private camposEditables(dto: GuardarDatosComunidadDto): CamposEditables {
    return {
      nombre: dto.nombre,
      direccion: dto.direccion,
      banco: dto.banco ?? null,
      tipoCuenta: dto.tipoCuenta ?? null,
      numeroCuenta: dto.numeroCuenta ?? null,
      titularCuenta: dto.titularCuenta ?? null,
      identificadorTitular: dto.identificadorTitular ?? null,
      correoTransferencias: dto.correoTransferencias ?? null,
    };
  }

  private validarCuentaCompleta(campos: CamposEditables) {
    if (CAMPOS_TRANSFERENCIA.every((campo) => campos[campo] === null)) {
      return;
    }
    const faltan = CAMPOS_CUENTA.filter((campo) => campos[campo] === null);
    if (faltan.length) {
      throw new BadRequestException({
        message: MENSAJE_CUENTA_INCOMPLETA,
        campos: Object.fromEntries(
          faltan.map((campo) => [campo, FALTA_CAMPO[campo]]),
        ),
      });
    }
  }

  private async avisosCambioCuenta(
    manager: EntityManager,
    idRed: number,
    idActor: number,
    cambio: {
      comunidad: string;
      anterior: CamposEditables;
      nueva: CamposEditables;
    },
  ): Promise<CorreoSaliente[]> {
    const [actor, membresias] = await Promise.all([
      manager.findOne(Usuario, { where: { idUsuario: idActor } }),
      manager.find(Membresia, {
        where: {
          idRed,
          idUsuario: Not(idActor),
          idRol: In(AVISADOS_CAMBIO_CUENTA),
          activo: true,
          ...condicionVigente(),
        },
        relations: { usuario: true },
      }),
    ]);
    const destinatarios = new Map<number, Usuario>();
    for (const membresia of membresias) {
      if (membresia.usuario && !membresia.usuario.bloqueado) {
        destinatarios.set(membresia.idUsuario, membresia.usuario);
      }
    }
    const quien = actor?.nombre ?? 'Una persona de la administración';
    const cuentaNueva = this.describirCuenta(cambio.nueva);
    const cuentaAnterior = this.describirCuenta(cambio.anterior);
    return [...destinatarios.values()].map((usuario) => ({
      para: usuario.correo,
      asunto: `Cambiaron los datos para transferencias de ${cambio.comunidad}`,
      texto:
        `Hola ${usuario.nombre}:\n\n` +
        `${quien} cambió los datos de la cuenta que la app muestra a los residentes para pagar.\n\n` +
        `Ahora: ${cuentaNueva}\n` +
        `Antes: ${cuentaAnterior}\n\n` +
        `Si no reconoces este cambio, revisa los datos en el panel y avísale a la directiva cuanto antes: una cuenta equivocada puede desviar los pagos de la comunidad.`,
    }));
  }

  private describirCuenta(campos: CamposEditables) {
    if (!campos.numeroCuenta) {
      return 'sin cuenta para transferencias';
    }
    return [
      campos.banco,
      campos.tipoCuenta,
      enmascararCuenta(campos.numeroCuenta),
      campos.titularCuenta ? `a nombre de ${campos.titularCuenta}` : null,
    ]
      .filter(Boolean)
      .join(', ');
  }

  private serializar(comunidad: RedVecinal) {
    return {
      idRed: comunidad.idRed,
      nombre: comunidad.nombre,
      tipo: comunidad.tipo,
      direccion: comunidad.direccion,
      banco: comunidad.banco,
      tipoCuenta: comunidad.tipoCuenta,
      numeroCuenta: comunidad.numeroCuenta,
      titularCuenta: comunidad.titularCuenta,
      identificadorTitular: comunidad.identificadorTitular,
      correoTransferencias: comunidad.correoTransferencias,
      umbralVisado: comunidad.umbralVisado,
    };
  }
}

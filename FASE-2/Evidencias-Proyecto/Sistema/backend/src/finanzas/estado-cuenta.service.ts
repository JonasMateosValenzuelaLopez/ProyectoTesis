import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { nombreCompleto } from '../common/utils/nombres';
import { fechaHoy } from '../common/utils/vigencia';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AvisarTransferenciaDto } from './dto/finanzas.dto';
import { AvisoPago, EstadoAviso } from './entities/aviso-pago.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Egreso, EstadoVisado } from './entities/egreso.entity';
import { EstadoExencion, Exencion } from './entities/exencion.entity';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from './entities/notificacion-enviada.entity';
import { estaAtrasado, periodoActual } from './reglas-finanzas';

export enum EstadoPlano {
  PAGADO = 'pagado',
  PENDIENTE = 'pendiente',
  MOROSO = 'moroso',
  EXENCION = 'exencion',
}

const EXENCION_EN_CURSO = [
  EstadoExencion.PENDIENTE,
  EstadoExencion.POR_APROBAR,
];

const suma = (filas: CobroUnidad[]) =>
  filas.reduce((total, fila) => total + fila.monto, 0);

@Injectable()
export class EstadoCuentaService {
  constructor(
    @InjectRepository(CobroUnidad)
    private readonly cobrosUnidadRepository: Repository<CobroUnidad>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async estadoPanel(red: ContextoRed) {
    const manager = this.dataSource.manager;
    const hoy = fechaHoy();
    const periodo = periodoActual(hoy);
    const [unidades, filas, avisos, exenciones, ultimo, egresosPorVisar] =
      await Promise.all([
        manager.find(Unidad, {
          where: { idRed: red.idRed },
          order: { orden: 'ASC', idUnidad: 'ASC' },
        }),
        this.cobrosUnidadRepository.find({
          where: { cobro: { idRed: red.idRed } },
          relations: { cobro: true },
        }),
        manager.find(AvisoPago, {
          where: {
            estado: EstadoAviso.PENDIENTE,
            cobroUnidad: { cobro: { idRed: red.idRed } },
          },
          relations: { cobroUnidad: { cobro: true } },
          order: { idAviso: 'ASC' },
        }),
        manager.find(Exencion, {
          where: {
            estado: In(EXENCION_EN_CURSO),
            cobroUnidad: { cobro: { idRed: red.idRed } },
          },
          relations: { cobroUnidad: true },
        }),
        manager.findOne(NotificacionEnviada, {
          where: {
            idRed: red.idRed,
            tipo: TipoNotificacion.RECORDATORIO_MOROSIDAD,
          },
          order: { idNotificacion: 'DESC' },
        }),
        manager.count(Egreso, {
          where: { idRed: red.idRed, estadoVisado: EstadoVisado.PENDIENTE },
        }),
      ]);
    const usuarios = await this.usuariosPorId(
      avisos.map((aviso) => aviso.idUsuario),
    );
    const conExencion = new Set(
      exenciones.map((exencion) => exencion.cobroUnidad.idUnidad),
    );
    const porUnidad = new Map<number, CobroUnidad[]>();
    for (const fila of filas) {
      porUnidad.set(fila.idUnidad, [
        ...(porUnidad.get(fila.idUnidad) ?? []),
        fila,
      ]);
    }

    const resumenUnidades = unidades.map((unidad) => {
      const propias = porUnidad.get(unidad.idUnidad) ?? [];
      const atrasados = propias.filter((fila) =>
        estaAtrasado(fila, fila.cobro, hoy),
      );
      const delMes = propias.filter((fila) => fila.cobro.periodo === periodo);
      const estado = atrasados.length
        ? EstadoPlano.MOROSO
        : conExencion.has(unidad.idUnidad)
          ? EstadoPlano.EXENCION
          : delMes.length === 0
            ? null
            : delMes.some((fila) => fila.estado === EstadoCobroUnidad.PENDIENTE)
              ? EstadoPlano.PENDIENTE
              : EstadoPlano.PAGADO;
      const pendientes = propias.filter(
        (fila) => fila.estado === EstadoCobroUnidad.PENDIENTE,
      );
      return {
        unidad,
        estado,
        deudaAtrasada: suma(atrasados),
        pendienteNoVencido: suma(pendientes) - suma(atrasados),
        cobrosAtrasados: atrasados.length,
        delMes,
      };
    });
    const delMes = resumenUnidades.flatMap((r) =>
      r.delMes.filter((fila) => fila.estado !== EstadoCobroUnidad.EXENTO),
    );

    return {
      periodo,
      resumen: {
        totalUnidades: unidades.length,
        alDia: resumenUnidades.filter((r) => r.estado === EstadoPlano.PAGADO)
          .length,
        esperado: suma(delMes),
        recaudado: suma(
          delMes.filter((fila) => fila.estado === EstadoCobroUnidad.PAGADO),
        ),
        deudaMorosa: resumenUnidades.reduce((t, r) => t + r.deudaAtrasada, 0),
        avisosPorValidar: avisos.length,
        exencionesEnCurso: exenciones.length,
        egresosPorVisar,
      },
      unidades: resumenUnidades.map((r) => ({
        idUnidad: r.unidad.idUnidad,
        estado: r.estado,
      })),
      morosos: resumenUnidades
        .filter((r) => r.deudaAtrasada > 0)
        .map((r) => ({
          idUnidad: r.unidad.idUnidad,
          numeroIdentificador: r.unidad.numeroIdentificador,
          callePasaje: r.unidad.callePasaje,
          deudaAtrasada: r.deudaAtrasada,
          pendienteNoVencido: r.pendienteNoVencido,
          total: r.deudaAtrasada + r.pendienteNoVencido,
          cobrosAtrasados: r.cobrosAtrasados,
        }))
        .sort((a, b) => b.total - a.total),
      avisosPorValidar: avisos.map((aviso) => ({
        ...this.serializarAviso(aviso, usuarios),
        idUnidad: aviso.cobroUnidad.idUnidad,
        concepto: aviso.cobroUnidad.cobro.concepto,
      })),
      ultimoRecordatorio: ultimo
        ? { fecha: ultimo.fechaCreacion, destinatarios: ultimo.destinatarios }
        : null,
    };
  }

  async detalleUnidad(red: ContextoRed, idUnidad: number) {
    const unidad = await this.dataSource.manager.findOne(Unidad, {
      where: { idUnidad, idRed: red.idRed },
    });
    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada');
    }
    return this.cuentaDe(unidad);
  }

  async miCuenta(red: ContextoRed) {
    const manager = this.dataSource.manager;
    const [comunidad, unidades] = await Promise.all([
      manager.findOneByOrFail(RedVecinal, { idRed: red.idRed }),
      red.idsUnidades.length
        ? manager.find(Unidad, {
            where: { idUnidad: In(red.idsUnidades), idRed: red.idRed },
            order: { orden: 'ASC', idUnidad: 'ASC' },
          })
        : Promise.resolve([] as Unidad[]),
    ]);
    return {
      datosTransferencia: {
        banco: comunidad.banco,
        tipoCuenta: comunidad.tipoCuenta,
        numeroCuenta: comunidad.numeroCuenta,
        titularCuenta: comunidad.titularCuenta,
        identificadorTitular: comunidad.identificadorTitular,
        correoTransferencias: comunidad.correoTransferencias,
      },
      unidades: await Promise.all(
        unidades.map((unidad) => this.cuentaDe(unidad)),
      ),
    };
  }

  async avisarTransferencia(
    red: ContextoRed,
    idUsuario: number,
    dto: AvisarTransferenciaDto,
  ) {
    if (!red.idsUnidades.includes(dto.idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const creados = await this.dataSource.transaction(async (manager) => {
      await manager.findOne(Unidad, {
        where: { idUnidad: dto.idUnidad, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      const pendientes = await manager.find(CobroUnidad, {
        where: {
          idUnidad: dto.idUnidad,
          estado: EstadoCobroUnidad.PENDIENTE,
          cobro: { idRed: red.idRed },
        },
        relations: { cobro: true, avisos: true },
        order: { cobro: { fechaVencimiento: 'ASC' }, idCobroUnidad: 'ASC' },
      });
      const sinAviso = pendientes.filter(
        (fila) =>
          !fila.avisos.some((aviso) => aviso.estado === EstadoAviso.PENDIENTE),
      );
      if (sinAviso.length === 0) {
        throw new ConflictException(
          'No tienes cobros pendientes sin aviso. Si ya avisaste, la administración lo está revisando.',
        );
      }
      let resto = dto.monto;
      const avisos: Partial<AvisoPago>[] = [];
      for (const [indice, fila] of sinAviso.entries()) {
        if (resto <= 0) {
          break;
        }
        const monto =
          indice === sinAviso.length - 1 ? resto : Math.min(resto, fila.monto);
        resto -= monto;
        avisos.push({
          idCobroUnidad: fila.idCobroUnidad,
          idUsuario,
          monto,
          fechaPago: dto.fechaPago,
          observacion: dto.observacion ?? null,
        });
      }
      await manager.insert(AvisoPago, avisos);
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: 'avisar_transferencia',
          entidad: 'cobros_avisos_pago',
          detalle: {
            idUnidad: dto.idUnidad,
            monto: dto.monto,
            fechaPago: dto.fechaPago,
            cobros: avisos.length,
          },
        },
        manager,
      );
      return avisos.length;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return { avisos: creados };
  }

  private async cuentaDe(unidad: Unidad) {
    const hoy = fechaHoy();
    const filas = await this.cobrosUnidadRepository.find({
      where: { idUnidad: unidad.idUnidad, cobro: { idRed: unidad.idRed } },
      relations: { cobro: true, avisos: true },
      order: { cobro: { periodo: 'DESC', idCobro: 'ASC' } },
    });
    const exenciones = filas.length
      ? await this.dataSource.manager.find(Exencion, {
          where: { idCobroUnidad: In(filas.map((fila) => fila.idCobroUnidad)) },
          order: { idExencion: 'DESC' },
        })
      : [];
    const usuarios = await this.usuariosPorId(
      filas.flatMap((fila) => fila.avisos.map((aviso) => aviso.idUsuario)),
    );
    const atrasados = filas.filter((fila) =>
      estaAtrasado(fila, fila.cobro, hoy),
    );
    const pendientes = filas.filter(
      (fila) => fila.estado === EstadoCobroUnidad.PENDIENTE,
    );
    return {
      idUnidad: unidad.idUnidad,
      numeroIdentificador: unidad.numeroIdentificador,
      callePasaje: unidad.callePasaje,
      deudaAtrasada: suma(atrasados),
      pendienteNoVencido: suma(pendientes) - suma(atrasados),
      total: suma(pendientes),
      cobros: filas.map((fila) => {
        const exencion = exenciones.find(
          (e) => e.idCobroUnidad === fila.idCobroUnidad,
        );
        return {
          idCobroUnidad: fila.idCobroUnidad,
          idCobro: fila.idCobro,
          concepto: fila.cobro.concepto,
          periodo: fila.cobro.periodo,
          fechaVencimiento: fila.cobro.fechaVencimiento,
          extraordinario: fila.cobro.extraordinario,
          monto: fila.monto,
          estado: fila.estado,
          atrasado: estaAtrasado(fila, fila.cobro, hoy),
          pagadoMarcadoEn: fila.pagadoMarcadoEn,
          exencion: exencion
            ? { idExencion: exencion.idExencion, estado: exencion.estado }
            : null,
          avisos: [...fila.avisos]
            .sort((a, b) => a.idAviso - b.idAviso)
            .map((aviso) => this.serializarAviso(aviso, usuarios)),
        };
      }),
    };
  }

  private async usuariosPorId(ids: (number | null)[]) {
    const unicos = [...new Set(ids.filter((id): id is number => id !== null))];
    const usuarios = unicos.length
      ? await this.dataSource.manager.find(Usuario, {
          where: { idUsuario: In(unicos) },
          withDeleted: true,
        })
      : [];
    return new Map(usuarios.map((usuario) => [usuario.idUsuario, usuario]));
  }

  private serializarAviso(aviso: AvisoPago, usuarios: Map<number, Usuario>) {
    const usuario =
      aviso.idUsuario !== null ? usuarios.get(aviso.idUsuario) : undefined;
    return {
      idAviso: aviso.idAviso,
      idCobroUnidad: aviso.idCobroUnidad,
      monto: aviso.monto,
      fechaPago: aviso.fechaPago,
      observacion: aviso.observacion,
      estado: aviso.estado,
      motivoRechazo: aviso.motivoRechazo,
      avisadoPor: usuario
        ? { idUsuario: usuario.idUsuario, nombre: nombreCompleto(usuario) }
        : null,
    };
  }
}

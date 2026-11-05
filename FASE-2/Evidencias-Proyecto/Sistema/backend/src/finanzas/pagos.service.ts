import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, LessThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaHoy } from '../common/utils/vigencia';
import { CorreosFinanzasService } from './correos-finanzas.service';
import { MarcarPagosDto, RechazarAvisosDto } from './dto/finanzas.dto';
import { AvisoPago, EstadoAviso } from './entities/aviso-pago.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from './entities/notificacion-enviada.entity';
import { pesos } from './reglas-finanzas';

const MOTIVO_RECHAZO = 'La administración no encontró la transferencia';
const MOTIVO_ANULACION = 'Pago anulado desde el panel';
const ASUNTO_RECORDATORIO = 'Recordatorio de deuda pendiente';

@Injectable()
export class PagosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly correosService: CorreosFinanzasService,
  ) {}

  async marcarPagos(red: ContextoRed, idUsuario: number, dto: MarcarPagosDto) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const filas = await this.bloquearCobrosUnidad(
        manager,
        red,
        dto.idsCobroUnidad,
      );
      if (filas.some((fila) => fila.estado !== EstadoCobroUnidad.PENDIENTE)) {
        throw new ConflictException(
          'Algunos cobros ya no están pendientes. Actualiza e intenta de nuevo.',
        );
      }
      const ahora = new Date();
      await manager.update(
        CobroUnidad,
        { idCobroUnidad: In(dto.idsCobroUnidad) },
        {
          estado: EstadoCobroUnidad.PAGADO,
          pagadoMarcadoEn: ahora,
          pagadoMarcadoPor: idUsuario,
        },
      );
      const { affected } = await manager.update(
        AvisoPago,
        {
          idCobroUnidad: In(dto.idsCobroUnidad),
          estado: EstadoAviso.PENDIENTE,
        },
        {
          estado: EstadoAviso.VALIDADO,
          validadoPor: idUsuario,
          validadoEn: ahora,
        },
      );
      await this.registrar(manager, red, idUsuario, 'marcar_pago', {
        idsCobroUnidad: dto.idsCobroUnidad,
        unidades: [...new Set(filas.map((fila) => fila.idUnidad))],
        metodo: dto.metodo ?? null,
        avisosValidados: affected ?? 0,
      });
      return { marcados: filas.length, avisosValidados: affected ?? 0 };
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return resultado;
  }

  async anularPago(red: ContextoRed, idUsuario: number, idCobroUnidad: number) {
    await this.dataSource.transaction(async (manager) => {
      const [fila] = await this.bloquearCobrosUnidad(manager, red, [
        idCobroUnidad,
      ]);
      if (fila.estado !== EstadoCobroUnidad.PAGADO) {
        throw new ConflictException('Este cobro no está marcado como pagado');
      }
      await manager.update(
        CobroUnidad,
        { idCobroUnidad },
        {
          estado: EstadoCobroUnidad.PENDIENTE,
          pagadoMarcadoEn: null,
          pagadoMarcadoPor: null,
        },
      );
      await manager.update(
        AvisoPago,
        { idCobroUnidad, estado: EstadoAviso.VALIDADO },
        {
          estado: EstadoAviso.RECHAZADO,
          motivoRechazo: MOTIVO_ANULACION,
          validadoPor: idUsuario,
          validadoEn: new Date(),
        },
      );
      await this.registrar(manager, red, idUsuario, 'anular_pago', {
        idCobroUnidad,
        idUnidad: fila.idUnidad,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  async rechazarAvisos(
    red: ContextoRed,
    idUsuario: number,
    dto: RechazarAvisosDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const avisos = await manager.find(AvisoPago, {
        where: { idAviso: In(dto.idsAviso) },
        lock: { mode: 'pessimistic_write' },
      });
      const deLaRed =
        avisos.length === dto.idsAviso.length &&
        (await this.sonDeLaRed(manager, red, [
          ...new Set(avisos.map((aviso) => aviso.idCobroUnidad)),
        ]));
      if (!deLaRed) {
        throw new NotFoundException('Aviso no encontrado');
      }
      if (avisos.some((aviso) => aviso.estado !== EstadoAviso.PENDIENTE)) {
        throw new ConflictException(
          'Algunos avisos ya fueron revisados. Actualiza e intenta de nuevo.',
        );
      }
      await manager.update(
        AvisoPago,
        { idAviso: In(dto.idsAviso) },
        {
          estado: EstadoAviso.RECHAZADO,
          motivoRechazo: dto.motivo ?? MOTIVO_RECHAZO,
          validadoPor: idUsuario,
          validadoEn: new Date(),
        },
      );
      await this.registrar(manager, red, idUsuario, 'rechazar_aviso', {
        idsAviso: dto.idsAviso,
        motivo: dto.motivo ?? MOTIVO_RECHAZO,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return { rechazados: dto.idsAviso.length };
  }

  async enviarRecordatorio(red: ContextoRed, idUsuario: number) {
    const { destinatarios, deudaPorUnidad } = await this.dataSource.transaction(
      async (manager) => {
        const atrasados = await manager.find(CobroUnidad, {
          where: {
            estado: EstadoCobroUnidad.PENDIENTE,
            cobro: { idRed: red.idRed, fechaVencimiento: LessThan(fechaHoy()) },
          },
          relations: { cobro: true },
        });
        if (atrasados.length === 0) {
          throw new ConflictException('No hay unidades con deuda atrasada');
        }
        const deudaPorUnidad = new Map<number, number>();
        for (const fila of atrasados) {
          deudaPorUnidad.set(
            fila.idUnidad,
            (deudaPorUnidad.get(fila.idUnidad) ?? 0) + fila.monto,
          );
        }
        const destinatarios = await this.correosService.destinatarios(
          manager,
          red.idRed,
          [...deudaPorUnidad.keys()],
        );
        await manager.insert(NotificacionEnviada, {
          idRed: red.idRed,
          tipo: TipoNotificacion.RECORDATORIO_MOROSIDAD,
          asunto: ASUNTO_RECORDATORIO,
          destinatarios: destinatarios.length,
          enviadoPor: idUsuario,
        });
        await this.registrar(manager, red, idUsuario, 'enviar_recordatorio', {
          unidades: deudaPorUnidad.size,
          destinatarios: destinatarios.length,
        });
        return { destinatarios, deudaPorUnidad };
      },
    );

    await this.bitacoraService.marcarActividad(red.idRed);
    this.correosService.enviarEnSegundoPlano(
      destinatarios.map((destinatario) => ({
        para: destinatario.correo,
        asunto: ASUNTO_RECORDATORIO,
        texto:
          `Hola ${destinatario.nombre}:\n\n` +
          `Tu vivienda tiene cobros vencidos por ${pesos(
            destinatario.idsUnidad.reduce(
              (total, id) => total + (deudaPorUnidad.get(id) ?? 0),
              0,
            ),
          )}. ` +
          `Revisa el detalle y los datos para transferir en la app EntreCasas. ` +
          `Si ya pagaste, avisa tu transferencia desde la app.`,
      })),
    );
    return {
      unidades: deudaPorUnidad.size,
      destinatarios: destinatarios.length,
    };
  }

  private async bloquearCobrosUnidad(
    manager: EntityManager,
    red: ContextoRed,
    ids: number[],
  ) {
    const filas = await manager.find(CobroUnidad, {
      where: { idCobroUnidad: In(ids) },
      lock: { mode: 'pessimistic_write' },
    });
    if (
      filas.length !== ids.length ||
      !(await this.cobrosDeLaRed(manager, red, filas))
    ) {
      throw new NotFoundException('Cobro de unidad no encontrado');
    }
    return filas;
  }

  private async sonDeLaRed(
    manager: EntityManager,
    red: ContextoRed,
    idsCobroUnidad: number[],
  ) {
    const filas = await manager.find(CobroUnidad, {
      select: { idCobroUnidad: true, idCobro: true },
      where: { idCobroUnidad: In(idsCobroUnidad) },
    });
    return (
      filas.length === idsCobroUnidad.length &&
      this.cobrosDeLaRed(manager, red, filas)
    );
  }

  private async cobrosDeLaRed(
    manager: EntityManager,
    red: ContextoRed,
    filas: Pick<CobroUnidad, 'idCobro'>[],
  ) {
    const idsCobro = [...new Set(filas.map((fila) => fila.idCobro))];
    const propios = await manager.count(Cobro, {
      where: { idCobro: In(idsCobro), idRed: red.idRed },
    });
    return propios === idsCobro.length;
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'cobro_unidades',
        detalle,
      },
      manager,
    );
  }
}

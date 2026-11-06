import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { CorreoSaliente } from '../mail/mail.service';
import { fechaLegible } from '../finanzas/reglas-finanzas';
import { EstadoReserva, Reserva } from './entities/reserva.entity';

export interface ResultadoCancelacion {
  correos: CorreoSaliente[];
  sinAviso: number;
}

@Injectable()
export class CancelacionesService {
  constructor(private readonly correosService: CorreosComunidadService) {}

  async cancelar(
    manager: EntityManager,
    idRed: number,
    reservas: Reserva[],
    nombreEspacio: (idEspacio: number) => string,
    motivo: string,
  ): Promise<ResultadoCancelacion> {
    if (reservas.length === 0) {
      return { correos: [], sinAviso: 0 };
    }
    await manager.update(
      Reserva,
      { idReserva: In(reservas.map((reserva) => reserva.idReserva)) },
      { estadoReserva: EstadoReserva.CANCELADA, motivoCancelacion: motivo },
    );
    const idsUnidad = [
      ...new Set(
        reservas
          .map((reserva) => reserva.idUnidad)
          .filter((id): id is number => id !== null),
      ),
    ];
    const destinatarios = await this.correosService.destinatarios(
      manager,
      idRed,
      idsUnidad,
    );
    const avisadosDe = (reserva: Reserva) =>
      destinatarios.filter(
        (destinatario) =>
          reserva.idUnidad !== null &&
          destinatario.idsUnidad.includes(reserva.idUnidad),
      );
    const correos = reservas.flatMap((reserva) =>
      avisadosDe(reserva).map((destinatario) => ({
        para: destinatario.correo,
        asunto: `Reserva cancelada: ${nombreEspacio(reserva.idEspacio)}`,
        texto:
          `Hola ${destinatario.nombre}:\n\n` +
          `Se canceló la reserva de ${nombreEspacio(reserva.idEspacio)} del ` +
          `${fechaLegible(reserva.fechaReserva)}, de ${reserva.horaInicio} a ${reserva.horaFin}.\n\n` +
          `Motivo: ${motivo}\n\n` +
          `Puedes ver tus reservas en la app EntreCasas.`,
      })),
    );
    return {
      correos,
      sinAviso: reservas.filter((reserva) => avisadosDe(reserva).length === 0)
        .length,
    };
  }

  enviar(correos: CorreoSaliente[]) {
    if (correos.length > 0) {
      this.correosService.enviarEnSegundoPlano(correos);
    }
  }
}

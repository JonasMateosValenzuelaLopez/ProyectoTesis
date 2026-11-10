import { RolUsuario } from '../common/enums/rol.enum';
import { sumarDias } from '../common/utils/fechas';
import { fechaHoy, horaActual } from '../common/utils/vigencia';
import { EstadoReserva, Reserva } from './entities/reserva.entity';

export const DIAS_PARA_RESERVAR = 14;
export const MAX_BLOQUES_POR_DIA = 2;
export const HORAS_PARA_CANCELAR = 24;
export const MAX_ESPACIOS = 20;
export const MAX_BLOQUES_POR_ESPACIO = 24;
export const MOTIVO_BAJA = 'El espacio dejó de estar disponible';
export const MOTIVO_HORARIO =
  'El horario reservado cambió o dejó de estar disponible';
export const OBSERVACION_SIN_NOVEDADES = 'Sin novedades';

export const GESTION_RESERVAS = [RolUsuario.ADMINISTRADOR];
export const CONSERJERIA_RESERVAS = [RolUsuario.CONSERJE];

const HORA_MS = 60 * 60 * 1000;

export type EstadoVisible = EstadoReserva | 'Entregado' | 'Devuelto';

export function momentoLocal(ahora: Date = new Date()): string {
  return `${fechaHoy(ahora)} ${horaActual(ahora)}`;
}

export const inicioDe = (
  reserva: Pick<Reserva, 'fechaReserva' | 'horaInicio'>,
) => `${reserva.fechaReserva} ${reserva.horaInicio}`;

export function ultimoDiaReservable(hoy: string = fechaHoy()): string {
  return sumarDias(hoy, DIAS_PARA_RESERVAR - 1);
}

export function estadoVisible(reserva: Reserva): EstadoVisible {
  if (reserva.recibidoEn) {
    return 'Devuelto';
  }
  if (reserva.entregadoEn) {
    return 'Entregado';
  }
  return reserva.estadoReserva;
}

export function yaEmpezo(
  reserva: Pick<Reserva, 'fechaReserva' | 'horaInicio'>,
  ahora: Date = new Date(),
): boolean {
  return inicioDe(reserva) <= momentoLocal(ahora);
}

export function puedeCancelarResidente(
  reserva: Reserva,
  ahora: Date = new Date(),
): boolean {
  return (
    reserva.estadoReserva === EstadoReserva.APROBADA &&
    !reserva.entregadoEn &&
    inicioDe(reserva) >=
      momentoLocal(new Date(ahora.getTime() + HORAS_PARA_CANCELAR * HORA_MS))
  );
}

export const seCruzan = (
  a: { horaInicio: string; horaFin: string },
  b: { horaInicio: string; horaFin: string },
) => a.horaInicio < b.horaFin && b.horaInicio < a.horaFin;

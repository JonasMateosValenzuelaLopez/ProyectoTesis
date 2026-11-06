import { IsNull, LessThanOrEqual, MoreThanOrEqual, Or } from 'typeorm';

export const ZONA_HORARIA = 'America/Santiago';

const formatoFecha = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_HORARIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function fechaHoy(ahora: Date = new Date()): string {
  return formatoFecha.format(ahora);
}

export function condicionVigente(hoy: string = fechaHoy()) {
  return {
    desde: LessThanOrEqual(hoy),
    hasta: Or(IsNull(), MoreThanOrEqual(hoy)),
  };
}

const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function horaActual(ahora: Date = new Date()): string {
  return formatoHora.format(ahora);
}

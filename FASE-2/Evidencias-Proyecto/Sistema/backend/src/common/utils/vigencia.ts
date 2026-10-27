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

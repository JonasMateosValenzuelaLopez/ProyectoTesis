import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { sumarDias } from '../common/utils/fechas';
import { fechaHoy, ZONA_HORARIA } from '../common/utils/vigencia';
import { Votacion } from './entities/votacion.entity';

export const DIRECTIVA_VOTACIONES: readonly RolUsuario[] = [
  RolUsuario.SECRETARIO,
  RolUsuario.PRESIDENTE,
];
export const MIN_OPCIONES = 2;
export const MAX_OPCIONES = 6;
export const MAX_DIAS_ABIERTA = 90;
export const MAX_ACUERDOS = 30;

const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONA_HORARIA,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function finDelDia(fecha: string): Date {
  const medianocheUtc = new Date(`${sumarDias(fecha, 1)}T00:00:00.000Z`);
  const [hora, minuto] = formatoHora
    .format(medianocheUtc)
    .split(':')
    .map(Number);
  const desfaseMs = ((24 - hora) * 60 - minuto) * 60 * 1000;
  return new Date(medianocheUtc.getTime() + desfaseMs - 1000);
}

export const estaAbierta = (votacion: Votacion, ahora: Date = new Date()) =>
  !votacion.cerradaEn && ahora < votacion.cierre;

export const fechaCierre = (votacion: Votacion) =>
  fechaHoy(votacion.cerradaEn ?? votacion.cierre);

export const esDirectiva = (red: ContextoRed) =>
  red.roles.some((rol) => DIRECTIVA_VOTACIONES.includes(rol));

export function resultado(
  conteos: { idOpcion: number; votos: number }[],
  totalUnidades: number,
  quorumMinimo: number | null,
) {
  const votos = conteos.reduce((suma, opcion) => suma + opcion.votos, 0);
  const participacion = totalUnidades
    ? Math.round((votos / totalUnidades) * 1000) / 10
    : 0;
  const ordenadas = [...conteos].sort((a, b) => b.votos - a.votos);
  const empate =
    ordenadas.length > 1 && ordenadas[0].votos === ordenadas[1].votos;
  const alcanzaQuorum =
    quorumMinimo === null || votos * 100 >= quorumMinimo * totalUnidades;
  return {
    votos,
    participacion,
    faltan: totalUnidades - votos,
    alcanzaQuorum,
    idOpcionGanadora:
      votos && !empate && alcanzaQuorum ? ordenadas[0].idOpcion : null,
  };
}

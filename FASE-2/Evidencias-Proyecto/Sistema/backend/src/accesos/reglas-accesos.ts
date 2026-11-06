import { randomInt } from 'node:crypto';
import { RolUsuario } from '../common/enums/rol.enum';
import { Invitacion } from './entities/invitacion.entity';
import {
  EstadoAutorizacion,
  RegistroAcceso,
  ViaAutorizacion,
} from './entities/registro-acceso.entity';

export const GARITA = [RolUsuario.CONSERJE, RolUsuario.ADMINISTRADOR];

export const MINUTO_MS = 60 * 1000;
export const TOLERANCIA_ANTICIPO_MS = 15 * MINUTO_MS;
export const VENTANA_PENDIENTE_MS = 30 * MINUTO_MS;

export const limitePendiente = (ahora: Date = new Date()) =>
  new Date(ahora.getTime() - VENTANA_PENDIENTE_MS);

export const decisionAcceso = (
  aprobado: boolean,
  via: ViaAutorizacion,
  ahora: Date = new Date(),
) => ({
  estadoAutorizacion: aprobado
    ? EstadoAutorizacion.APROBADO
    : EstadoAutorizacion.RECHAZADO,
  autorizadoVia: via,
  fechaIngreso: aprobado ? ahora : null,
});
export const MAX_DURACION_MS = 24 * 60 * MINUTO_MS;
export const MAX_DIAS_ANTICIPACION = 60;
export const MAX_INVITACIONES_VIGENTES = 30;
export const MAX_INVITACIONES_LISTADAS = 100;

const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LARGO_BLOQUE = 4;

export function generarCodigo(): string {
  const bloque = () =>
    Array.from(
      { length: LARGO_BLOQUE },
      () => ALFABETO[randomInt(ALFABETO.length)],
    ).join('');
  return `EC-${bloque()}-${bloque()}`;
}

export function normalizarCodigo(valor: string): string | null {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cuerpo =
    limpio.length === LARGO_BLOQUE * 2 + 2 && limpio.startsWith('EC')
      ? limpio.slice(2)
      : limpio;
  if (cuerpo.length !== LARGO_BLOQUE * 2) {
    return null;
  }
  return `EC-${cuerpo.slice(0, LARGO_BLOQUE)}-${cuerpo.slice(LARGO_BLOQUE)}`;
}

export type EstadoInvitacion =
  'Esperada' | 'Adentro' | 'Salió' | 'Cancelada' | 'Vencida';

export function estadoInvitacion(
  invitacion: Invitacion,
  acceso: RegistroAcceso | null | undefined,
  ahora: Date = new Date(),
): EstadoInvitacion {
  if (acceso) {
    return acceso.fechaSalida ? 'Salió' : 'Adentro';
  }
  if (invitacion.canceladaEn) {
    return 'Cancelada';
  }
  return ahora >= invitacion.validaHasta ? 'Vencida' : 'Esperada';
}

export type ResultadoValidacion =
  | 'valido'
  | 'temprano'
  | 'vencido'
  | 'usado'
  | 'adentro'
  | 'cancelada'
  | 'sin_invitante'
  | 'no_existe';

export function resultadoValidacion(
  invitacion: Invitacion | null,
  acceso: RegistroAcceso | null | undefined,
  invitanteVigente: boolean,
  ahora: Date = new Date(),
): ResultadoValidacion {
  if (!invitacion) {
    return 'no_existe';
  }
  if (acceso) {
    return acceso.fechaSalida ? 'usado' : 'adentro';
  }
  if (invitacion.canceladaEn) {
    return 'cancelada';
  }
  if (!invitanteVigente) {
    return 'sin_invitante';
  }
  if (
    ahora.getTime() <
    invitacion.validaDesde.getTime() - TOLERANCIA_ANTICIPO_MS
  ) {
    return 'temprano';
  }
  return ahora >= invitacion.validaHasta ? 'vencido' : 'valido';
}

export const MENSAJE_RESULTADO: Record<
  Exclude<ResultadoValidacion, 'valido'>,
  string
> = {
  temprano: 'Todavía no es su hora: la invitación aún no comienza',
  vencido: 'La invitación está vencida',
  usado: 'Este código ya se usó',
  adentro: 'La visita ya está adentro',
  cancelada: 'La invitación fue cancelada',
  sin_invitante:
    'Quien invitó ya no vive en la vivienda o no tiene acceso a la comunidad',
  no_existe: 'Código no encontrado',
};

export function separarNombre(nombreCompleto: string) {
  const [nombre, ...resto] = nombreCompleto.split(' ');
  return {
    nombre: nombre.slice(0, 50),
    apellido: resto.join(' ').slice(0, 50),
  };
}

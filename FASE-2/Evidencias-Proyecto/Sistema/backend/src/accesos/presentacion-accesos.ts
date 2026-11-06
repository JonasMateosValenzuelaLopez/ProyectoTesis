import { ConflictException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { Unidad } from '../unidades/entities/unidad.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { Invitacion } from './entities/invitacion.entity';
import {
  EstadoAutorizacion,
  RegistroAcceso,
} from './entities/registro-acceso.entity';
import { Visitante } from './entities/visitante.entity';
import { estadoInvitacion } from './reglas-accesos';

export const persona = (
  nombres: Map<number, string>,
  idUsuario: number | null,
) =>
  idUsuario === null
    ? null
    : { idUsuario, nombre: nombres.get(idUsuario) ?? null };

export const vivienda = (unidad: Unidad | null | undefined) =>
  unidad
    ? {
        idUnidad: unidad.idUnidad,
        numeroIdentificador: unidad.numeroIdentificador,
        torre: unidad.torre,
      }
    : null;

export const nombreVisitante = (visitante: Visitante | null | undefined) =>
  visitante
    ? [visitante.nombre, visitante.apellido].filter(Boolean).join(' ')
    : null;

export async function accesosPorInvitacion(
  manager: EntityManager,
  ids: number[],
): Promise<Map<number, RegistroAcceso>> {
  if (ids.length === 0) {
    return new Map();
  }
  const accesos = await manager.find(RegistroAcceso, {
    where: { idInvitacion: In(ids) },
    withDeleted: true,
  });
  return new Map(accesos.map((a) => [a.idInvitacion as number, a]));
}

export type VistaInvitacion = 'garita' | 'creador' | 'hogar';

export function serializarInvitacion(
  invitacion: Invitacion,
  acceso: RegistroAcceso | undefined,
  nombres: Map<number, string>,
  vista: VistaInvitacion,
  ahora: Date = new Date(),
) {
  return {
    idInvitacion: invitacion.idInvitacion,
    ...(vista === 'creador' ? { codigo: invitacion.codigo } : {}),
    nombreVisita: invitacion.nombreVisita,
    rut: vista === 'hogar' ? null : invitacion.identificadorVisita,
    categoria: invitacion.categoria,
    patente: invitacion.patente,
    validaDesde: invitacion.validaDesde,
    validaHasta: invitacion.validaHasta,
    canceladaEn: invitacion.canceladaEn,
    estado: estadoInvitacion(invitacion, acceso, ahora),
    idAcceso: acceso?.idAcceso ?? null,
    ingresoEn: acceso?.fechaIngreso ?? null,
    salidaEn: acceso?.fechaSalida ?? null,
    unidad: vivienda(invitacion.unidad),
    invitadaPor: persona(nombres, invitacion.creadaPor),
  };
}

export function serializarAcceso(
  acceso: RegistroAcceso,
  nombres: Map<number, string>,
) {
  return {
    idAcceso: acceso.idAcceso,
    visitante: nombreVisitante(acceso.visitante),
    categoria: acceso.categoria,
    patente: acceso.patente,
    unidad: vivienda(acceso.unidad),
    idInvitacion: acceso.idInvitacion,
    estadoAutorizacion: acceso.estadoAutorizacion,
    autorizadoVia: acceso.autorizadoVia,
    autorizadoPor: persona(nombres, acceso.autorizadoPor),
    registradoPor: persona(nombres, acceso.validadoPor),
    metodo: acceso.metodo,
    llegada: acceso.fechaCreacion,
    ingresoEn: acceso.fechaIngreso,
    salidaEn: acceso.fechaSalida,
  };
}

export const conflictoDeResolucion = (acceso: RegistroAcceso) => {
  if (acceso.estadoAutorizacion === EstadoAutorizacion.PENDIENTE) {
    return new ConflictException(
      'La solicitud de ingreso expiró: la conserjería debe registrar la llegada de nuevo',
    );
  }
  return new ConflictException(
    acceso.estadoAutorizacion === EstadoAutorizacion.APROBADO
      ? 'Este ingreso ya fue aprobado'
      : 'Este ingreso ya fue rechazado',
  );
};

export const nombresDeAccesos = (
  manager: EntityManager,
  accesos: RegistroAcceso[],
) =>
  nombresPorId(
    manager,
    accesos.flatMap((a) => [a.autorizadoPor, a.validadoPor]),
  );

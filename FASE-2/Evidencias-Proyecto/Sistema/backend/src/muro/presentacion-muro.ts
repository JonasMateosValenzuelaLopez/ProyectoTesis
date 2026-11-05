import { EntityManager } from 'typeorm';
import { RolUsuario } from '../common/enums/rol.enum';
import { cargosVigentesPorUsuario } from '../usuarios/cargos-vigentes';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { MuroPublicacion } from './entities/muro-publicacion.entity';

export const DIRECTIVA_MURO = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.PRESIDENTE,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
];

export interface ContextoPresentacion {
  nombres: Map<number, string>;
  cargos: Map<number, string>;
}

export async function contextoPresentacion(
  manager: EntityManager,
  idRed: number,
  publicaciones: MuroPublicacion[],
  extras: (number | null)[] = [],
): Promise<ContextoPresentacion> {
  const ids = [
    ...publicaciones.flatMap((p) => [
      p.idUsuario,
      p.aprobadoPor,
      p.moderadoPor,
    ]),
    ...extras,
  ];
  const [nombres, cargos] = await Promise.all([
    nombresPorId(manager, ids),
    cargosVigentesPorUsuario(manager, idRed, ids),
  ]);
  return { nombres, cargos };
}

export const persona = (
  contexto: ContextoPresentacion,
  idUsuario: number | null,
) =>
  idUsuario === null
    ? null
    : {
        idUsuario,
        nombre: contexto.nombres.get(idUsuario) ?? null,
        cargo: contexto.cargos.get(idUsuario) ?? null,
      };

export const serializarPublicacion = (
  publicacion: MuroPublicacion,
  contexto: ContextoPresentacion,
) => ({
  idPublicacion: publicacion.idPublicacion,
  tipo: publicacion.tipo,
  titulo: publicacion.titulo,
  contenido: publicacion.contenido,
  fecha: publicacion.fechaCreacion,
  autor: persona(contexto, publicacion.idUsuario),
  unidad: publicacion.unidad
    ? {
        idUnidad: publicacion.unidad.idUnidad,
        numeroIdentificador: publicacion.unidad.numeroIdentificador,
      }
    : null,
  estadoAprobacion: publicacion.estadoAprobacion,
  aprobadoPor: persona(contexto, publicacion.aprobadoPor),
  aprobadoEn: publicacion.aprobadoEn,
  estadoModeracion: publicacion.estadoModeracion,
  moderadoEn: publicacion.moderadoEn,
});

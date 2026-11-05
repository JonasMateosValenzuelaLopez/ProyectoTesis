import { EntityManager, In } from 'typeorm';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { condicionVigente } from '../common/utils/vigencia';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { MuroPublicacion } from './entities/muro-publicacion.entity';

export const DIRECTIVA_MURO = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.PRESIDENTE,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
];

const PRIORIDAD_CARGO = [
  RolUsuario.PRESIDENTE,
  RolUsuario.ADMINISTRADOR,
  RolUsuario.SECRETARIO,
  RolUsuario.TESORERO,
  RolUsuario.CONSERJE,
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
  const unicos = [...new Set(ids.filter((id): id is number => id !== null))];
  const [nombres, membresias] = await Promise.all([
    nombresPorId(manager, unicos),
    unicos.length
      ? manager.find(Membresia, {
          where: {
            idRed,
            idUsuario: In(unicos),
            idRol: In(PRIORIDAD_CARGO),
            activo: true,
            ...condicionVigente(),
          },
        })
      : Promise.resolve([] as Membresia[]),
  ]);
  const cargos = new Map<number, string>();
  for (const rol of PRIORIDAD_CARGO) {
    for (const membresia of membresias.filter((m) => m.idRol === rol)) {
      if (!cargos.has(membresia.idUsuario)) {
        cargos.set(membresia.idUsuario, NOMBRE_ROL[rol]);
      }
    }
  }
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

import { EntityManager, In } from 'typeorm';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { condicionVigente } from '../common/utils/vigencia';
import { Membresia } from './entities/membresia.entity';

export const PRIORIDAD_CARGO = [
  RolUsuario.PRESIDENTE,
  RolUsuario.ADMINISTRADOR,
  RolUsuario.SECRETARIO,
  RolUsuario.TESORERO,
  RolUsuario.CONSERJE,
];

export async function cargosVigentesPorUsuario(
  manager: EntityManager,
  idRed: number,
  ids: (number | null)[],
): Promise<Map<number, string>> {
  const unicos = [...new Set(ids.filter((id): id is number => id !== null))];
  const cargos = new Map<number, string>();
  if (unicos.length === 0) {
    return cargos;
  }
  const membresias = await manager.find(Membresia, {
    where: {
      idRed,
      idUsuario: In(unicos),
      idRol: In(PRIORIDAD_CARGO),
      activo: true,
      ...condicionVigente(),
    },
  });
  for (const rol of PRIORIDAD_CARGO) {
    for (const membresia of membresias.filter((m) => m.idRol === rol)) {
      if (!cargos.has(membresia.idUsuario)) {
        cargos.set(membresia.idUsuario, NOMBRE_ROL[rol]);
      }
    }
  }
  return cargos;
}

import { EntityManager, In } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';

export async function telefonosPorId(
  manager: EntityManager,
  ids: number[],
): Promise<Map<number, string | null>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) {
    return new Map();
  }
  const usuarios = await manager.find(Usuario, {
    select: { idUsuario: true, telefono: true },
    where: { idUsuario: In(unicos) },
  });
  return new Map(usuarios.map((u) => [u.idUsuario, u.telefono]));
}

import { EntityManager, In } from 'typeorm';
import { nombreCompleto } from '../common/utils/nombres';
import { Usuario } from './entities/usuario.entity';

export async function nombresPorId(
  manager: EntityManager,
  ids: (number | null)[],
): Promise<Map<number, string>> {
  const unicos = [...new Set(ids.filter((id): id is number => id !== null))];
  if (unicos.length === 0) {
    return new Map();
  }
  const usuarios = await manager.find(Usuario, {
    where: { idUsuario: In(unicos) },
    withDeleted: true,
  });
  return new Map(
    usuarios.map((usuario) => [usuario.idUsuario, nombreCompleto(usuario)]),
  );
}

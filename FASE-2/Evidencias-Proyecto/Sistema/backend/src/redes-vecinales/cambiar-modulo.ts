import { EntityManager } from 'typeorm';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RedModulo } from './entities/red-modulo.entity';

export async function aplicarCambioModulo(
  manager: EntityManager,
  idRed: number,
  codigoModulo: CodigoModulo,
  activo: boolean,
  idUsuario: number,
): Promise<boolean> {
  const actual = await manager.findOne(RedModulo, {
    where: { idRed, codigoModulo },
    withDeleted: true,
  });
  const estabaActivo = Boolean(
    actual && !actual.fechaEliminacion && actual.activo,
  );
  if (estabaActivo === activo) {
    return false;
  }
  if (!actual) {
    await manager.insert(RedModulo, {
      idRed,
      codigoModulo,
      activo,
      actualizadoPor: idUsuario,
    });
    return true;
  }
  if (actual.fechaEliminacion) {
    await manager.restore(RedModulo, { idRed, codigoModulo });
  }
  await manager.update(
    RedModulo,
    { idRed, codigoModulo },
    { activo, actualizadoPor: idUsuario },
  );
  return true;
}

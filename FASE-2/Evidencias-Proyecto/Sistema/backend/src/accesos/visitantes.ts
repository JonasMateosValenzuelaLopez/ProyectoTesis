import { EntityManager } from 'typeorm';
import { TipoVisitante, Visitante } from './entities/visitante.entity';
import { separarNombre } from './reglas-accesos';

export async function obtenerVisitante(
  manager: EntityManager,
  idRed: number,
  nombreCompleto: string,
  rut: string | null,
): Promise<number> {
  const datos = {
    idRed,
    rut,
    ...separarNombre(nombreCompleto),
    tipo: TipoVisitante.ESPORADICO,
  };
  if (!rut) {
    const { identifiers } = await manager.insert(Visitante, datos);
    return identifiers[0].idVisitante as number;
  }
  await manager
    .createQueryBuilder()
    .insert()
    .into(Visitante)
    .values({ ...datos, fechaEliminacion: null })
    .orUpdate(['fecha_eliminacion'], ['id_red', 'rut'])
    .execute();
  const visitante = await manager.findOneOrFail(Visitante, {
    select: { idVisitante: true },
    where: { idRed, rut },
    lock: { mode: 'pessimistic_write' },
  });
  return visitante.idVisitante;
}

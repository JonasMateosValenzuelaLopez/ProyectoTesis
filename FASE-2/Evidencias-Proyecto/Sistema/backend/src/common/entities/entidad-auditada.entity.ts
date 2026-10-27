import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * Fechas de auditoría que llevan todas las tablas (migración 002).
 *
 * `fechaEliminacion` es borrado lógico: TypeORM excluye automáticamente esas
 * filas de find/findOne/QueryBuilder. Para eliminar usar `softDelete` o
 * `softRemove` (nunca `delete`), y `withDeleted: true` solo cuando haga falta
 * ver filas eliminadas (por ejemplo, para restaurarlas).
 *
 * Ojo:
 * - Los índices únicos cuentan también las filas eliminadas: antes de insertar,
 *   buscar con `withDeleted: true` y restaurar si corresponde.
 * - Una relación cargada hacia una fila eliminada llega en `null`.
 * - El borrado lógico no dispara los `ON DELETE CASCADE` de la BD: eliminar un
 *   usuario no elimina sus membresías ni sus tokens.
 * - `update` no filtra las filas eliminadas.
 * - Excepción: `membresias_roles` no tiene esta columna (ver migración 002);
 *   quitar un rol sí borra la fila.
 */
export abstract class EntidadAuditada {
  @CreateDateColumn({ name: 'fecha_creacion', type: 'datetime' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_actualizacion', type: 'datetime' })
  fechaActualizacion: Date;

  @DeleteDateColumn({
    name: 'fecha_eliminacion',
    type: 'datetime',
    nullable: true,
  })
  fechaEliminacion: Date | null;
}

import { CreateDateColumn, DeleteDateColumn, UpdateDateColumn } from 'typeorm';

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

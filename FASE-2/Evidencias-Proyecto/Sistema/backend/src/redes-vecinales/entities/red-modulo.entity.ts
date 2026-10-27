import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { CodigoModulo } from '../../common/enums/modulo.enum';
import { RedVecinal } from './red-vecinal.entity';

@Entity('red_modulos')
export class RedModulo extends EntidadAuditada {
  @PrimaryColumn({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @PrimaryColumn({ name: 'codigo_modulo', type: 'varchar', length: 30 })
  codigoModulo: CodigoModulo;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ name: 'actualizado_por', type: 'int', nullable: true })
  actualizadoPor: number | null;
}

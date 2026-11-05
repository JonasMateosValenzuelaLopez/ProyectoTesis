import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';

@Entity('espacios_comunes')
export class EspacioComun extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_espacio' })
  idEspacio: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'int', nullable: true })
  capacidad: number | null;

  @Column({ type: 'text', nullable: true })
  reglas: string | null;

  @Column({ type: 'boolean', nullable: true, default: true })
  estado: boolean | null;
}

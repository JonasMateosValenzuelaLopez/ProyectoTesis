import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';

@Entity('comunidad_contactos')
export class ComunidadContacto extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_contacto' })
  idContacto: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  detalle: string | null;

  @Column({ type: 'varchar', length: 15 })
  telefono: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  horario: string | null;

  @Column({ type: 'boolean', default: true })
  visible: boolean;
}

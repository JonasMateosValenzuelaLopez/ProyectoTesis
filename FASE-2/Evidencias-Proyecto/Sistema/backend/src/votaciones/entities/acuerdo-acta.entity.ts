import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Acta } from './acta.entity';

@Entity('votaciones_acuerdos_acta')
export class AcuerdoActa extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_acuerdo' })
  idAcuerdo: number;

  @Column({ name: 'id_acta', type: 'int' })
  idActa: number;

  @ManyToOne(() => Acta, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_acta' })
  acta: Acta;

  @Column({ type: 'varchar', length: 255 })
  texto: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  responsable: string | null;

  @Column({ type: 'date', nullable: true })
  plazo: string | null;
}

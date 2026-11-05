import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { CobroUnidad } from './cobro-unidad.entity';

export enum EstadoExencion {
  PENDIENTE = 'Pendiente',
  POR_APROBAR = 'Por aprobar',
  APROBADA = 'Aprobada',
  RECHAZADA = 'Rechazada',
}

@Entity('exenciones')
export class Exencion extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_exencion' })
  idExencion: number;

  @Column({ name: 'id_cobro_unidad', type: 'int' })
  idCobroUnidad: number;

  @ManyToOne(() => CobroUnidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cobro_unidad' })
  cobroUnidad: CobroUnidad;

  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @Column({ name: 'solicitada_por', type: 'int', nullable: true })
  solicitadaPor: number | null;

  @Column({
    type: 'enum',
    enum: EstadoExencion,
    default: EstadoExencion.PENDIENTE,
  })
  estado: EstadoExencion;

  @Column({ name: 'revisada_por', type: 'int', nullable: true })
  revisadaPor: number | null;

  @Column({ name: 'revisada_en', type: 'datetime', nullable: true })
  revisadaEn: Date | null;

  @Column({ name: 'resuelta_por', type: 'int', nullable: true })
  resueltaPor: number | null;

  @Column({ name: 'resuelta_en', type: 'datetime', nullable: true })
  resueltaEn: Date | null;

  @Column({
    name: 'comentario_resolucion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  comentarioResolucion: string | null;
}

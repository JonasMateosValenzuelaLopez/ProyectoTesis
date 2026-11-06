import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';

export enum TipoVotacion {
  VOTACION = 'Votación',
  ENCUESTA = 'Encuesta',
}

@Entity('votaciones')
export class Votacion extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_votacion' })
  idVotacion: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({ type: 'enum', enum: TipoVotacion })
  tipo: TipoVotacion;

  @Column({
    name: 'quorum_minimo',
    type: 'tinyint',
    unsigned: true,
    nullable: true,
  })
  quorumMinimo: number | null;

  @Column({ type: 'datetime' })
  inicio: Date;

  @Column({ type: 'datetime' })
  cierre: Date;

  @Column({ name: 'cerrada_en', type: 'datetime', nullable: true })
  cerradaEn: Date | null;

  @Column({ name: 'creada_por', type: 'int', nullable: true })
  creadaPor: number | null;
}

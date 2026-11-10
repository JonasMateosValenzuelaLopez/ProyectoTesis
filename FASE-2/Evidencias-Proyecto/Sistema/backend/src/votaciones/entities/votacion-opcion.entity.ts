import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Votacion } from './votacion.entity';

@Entity('votacion_opciones')
@Unique('uq_opcion_votacion', ['idOpcion', 'idVotacion'])
@Unique('uq_opcion_texto', ['idVotacion', 'texto'])
export class VotacionOpcion extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_opcion' })
  idOpcion: number;

  @Column({ name: 'id_votacion', type: 'int' })
  idVotacion: number;

  @ManyToOne(() => Votacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_votacion' })
  votacion: Votacion;

  @Column({ type: 'varchar', length: 150 })
  texto: string;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  orden: number;
}

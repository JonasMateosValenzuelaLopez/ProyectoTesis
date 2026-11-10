import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum TipoVisitante {
  FRECUENTE = 'Frecuente',
  ESPORADICO = 'Esporádico',
}

@Entity('visitantes')
@Unique('uq_visitante_red_rut', ['idRed', 'rut'])
export class Visitante extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_visitante' })
  idVisitante: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ type: 'varchar', length: 12, nullable: true })
  rut: string | null;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ type: 'varchar', length: 50 })
  apellido: string;

  @Column({
    type: 'enum',
    enum: TipoVisitante,
    nullable: true,
    default: TipoVisitante.ESPORADICO,
  })
  tipo: TipoVisitante | null;
}

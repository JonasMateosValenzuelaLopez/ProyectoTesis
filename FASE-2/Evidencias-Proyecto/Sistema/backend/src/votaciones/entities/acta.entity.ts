import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';

export enum TipoReunion {
  DIRECTIVA = 'Reunión de directiva',
  ORDINARIA = 'Asamblea ordinaria',
  EXTRAORDINARIA = 'Asamblea extraordinaria',
}

export const ASAMBLEAS: readonly TipoReunion[] = [
  TipoReunion.ORDINARIA,
  TipoReunion.EXTRAORDINARIA,
];

@Entity('actas')
@Unique('uq_acta_red_numero', ['idRed', 'numero'])
export class Acta extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_acta' })
  idActa: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ type: 'int' })
  numero: number;

  @Column({ type: 'varchar', length: 150 })
  titulo: string;

  @Column({ name: 'tipo_reunion', type: 'enum', enum: TipoReunion })
  tipoReunion: TipoReunion;

  @Column({ name: 'fecha_asamblea', type: 'date' })
  fechaAsamblea: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lugar: string | null;

  @Column({ name: 'unidades_presentes', type: 'int', nullable: true })
  unidadesPresentes: number | null;

  @Column({ type: 'text', nullable: true })
  asistentes: string | null;

  @Column({ type: 'text', nullable: true })
  temas: string | null;

  @Column({ type: 'longtext', nullable: true })
  contenido: string | null;

  @Column({
    name: 'archivo_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  archivoUrl: string | null;

  @Column({ type: 'boolean', default: false })
  publicada: boolean;

  @Column({ name: 'publicada_en', type: 'datetime', nullable: true })
  publicadaEn: Date | null;

  @Column({ name: 'creada_por', type: 'int', nullable: true })
  creadaPor: number | null;
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('accesos_retenciones')
export class RetencionAcceso extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_retencion' })
  idRetencion: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ type: 'datetime' })
  desde: Date;

  @Column({ type: 'datetime' })
  hasta: Date;

  @Column({ type: 'varchar', length: 300 })
  motivo: string;

  @Column({ name: 'creada_por', type: 'int', nullable: true })
  creadaPor: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creada_por' })
  creador: Usuario | null;

  @Column({ name: 'liberada_en', type: 'datetime', nullable: true })
  liberadaEn: Date | null;

  @Column({ name: 'liberada_por', type: 'int', nullable: true })
  liberadaPor: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'liberada_por' })
  liberador: Usuario | null;
}

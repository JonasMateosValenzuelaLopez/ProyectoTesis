import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { Visitante } from './visitante.entity';

export enum CategoriaAcceso {
  VISITA = 'Visita',
  PROVEEDOR = 'Proveedor',
  SERVICIO = 'Servicio',
  DELIVERY = 'Delivery',
}

@Entity('invitaciones')
@Unique('uq_invitacion_codigo', ['codigo'])
export class Invitacion extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_invitacion' })
  idInvitacion: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'id_unidad', type: 'int' })
  idUnidad: number;

  @ManyToOne(() => Unidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({ name: 'creada_por', type: 'int', nullable: true })
  creadaPor: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creada_por' })
  creador: Usuario | null;

  @Column({ name: 'id_visitante', type: 'int', nullable: true })
  idVisitante: number | null;

  @ManyToOne(() => Visitante, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_visitante' })
  visitante: Visitante | null;

  @Column({ name: 'nombre_visita', type: 'varchar', length: 100 })
  nombreVisita: string;

  @Column({
    name: 'identificador_visita',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  identificadorVisita: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  patente: string | null;

  @Column({
    type: 'enum',
    enum: CategoriaAcceso,
    default: CategoriaAcceso.VISITA,
  })
  categoria: CategoriaAcceso;

  @Column({ type: 'varchar', length: 20 })
  codigo: string;

  @Column({ name: 'valida_desde', type: 'datetime' })
  validaDesde: Date;

  @Column({ name: 'valida_hasta', type: 'datetime' })
  validaHasta: Date;

  @Column({ name: 'cancelada_en', type: 'datetime', nullable: true })
  canceladaEn: Date | null;
}

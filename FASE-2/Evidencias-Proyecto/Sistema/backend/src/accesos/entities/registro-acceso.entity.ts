import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { CategoriaAcceso, Invitacion } from './invitacion.entity';
import { Visitante } from './visitante.entity';

export enum EstadoAutorizacion {
  APROBADO = 'Aprobado',
  RECHAZADO = 'Rechazado',
  PENDIENTE = 'Pendiente de Confirmación',
}

export enum ViaAutorizacion {
  INVITACION = 'Invitación',
  APP = 'App',
  TELEFONO = 'Teléfono',
}

export enum MetodoAcceso {
  QR = 'QR',
  MANUAL = 'Manual',
}

@Entity('registro_accesos')
@Unique('uq_acceso_invitacion', ['idInvitacion'])
export class RegistroAcceso extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_acceso' })
  idAcceso: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'id_visitante', type: 'int', nullable: true })
  idVisitante: number | null;

  @ManyToOne(() => Visitante, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_visitante' })
  visitante: Visitante | null;

  @Column({ name: 'id_unidad', type: 'int' })
  idUnidad: number;

  @ManyToOne(() => Unidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({ name: 'id_invitacion', type: 'int', nullable: true })
  idInvitacion: number | null;

  @OneToOne(() => Invitacion, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_invitacion' })
  invitacion: Invitacion | null;

  @Column({
    type: 'enum',
    enum: CategoriaAcceso,
    default: CategoriaAcceso.VISITA,
  })
  categoria: CategoriaAcceso;

  @Column({ type: 'varchar', length: 10, nullable: true })
  patente: string | null;

  @Column({ name: 'fecha_ingreso', type: 'datetime', nullable: true })
  fechaIngreso: Date | null;

  @Column({ name: 'fecha_salida', type: 'datetime', nullable: true })
  fechaSalida: Date | null;

  @Column({
    name: 'estado_autorizacion',
    type: 'enum',
    enum: EstadoAutorizacion,
  })
  estadoAutorizacion: EstadoAutorizacion;

  @Column({
    name: 'autorizado_via',
    type: 'enum',
    enum: ViaAutorizacion,
    nullable: true,
  })
  autorizadoVia: ViaAutorizacion | null;

  @Column({ name: 'autorizado_por', type: 'int', nullable: true })
  autorizadoPor: number | null;

  @Column({ name: 'validado_por', type: 'int', nullable: true })
  validadoPor: number | null;

  @Column({ type: 'enum', enum: MetodoAcceso, default: MetodoAcceso.MANUAL })
  metodo: MetodoAcceso;
}

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
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { columnaHora } from './columna-hora';
import { EspacioComun } from './espacio-comun.entity';

export enum EstadoReserva {
  PENDIENTE = 'Pendiente',
  APROBADA = 'Aprobada',
  RECHAZADA = 'Rechazada',
  CANCELADA = 'Cancelada',
}

export const ESTADOS_ACTIVOS: readonly EstadoReserva[] = [
  EstadoReserva.PENDIENTE,
  EstadoReserva.APROBADA,
];

@Entity('reservas')
@Unique('uq_reserva_bloque_activo', [
  'idEspacio',
  'fechaReserva',
  'bloqueActivo',
])
export class Reserva extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_reserva' })
  idReserva: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ name: 'id_espacio', type: 'int' })
  idEspacio: number;

  @ManyToOne(() => EspacioComun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_espacio' })
  espacio: EspacioComun;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'id_unidad', type: 'int', nullable: true })
  idUnidad: number | null;

  @ManyToOne(() => Unidad, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({ name: 'fecha_reserva', type: 'date' })
  fechaReserva: string;

  @Column({ name: 'hora_inicio', type: 'time', transformer: columnaHora })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time', transformer: columnaHora })
  horaFin: string;

  @Column({
    name: 'bloque_activo',
    type: 'time',
    generatedType: 'STORED',
    asExpression:
      "case when `estado_reserva` in ('Pendiente','Aprobada') and `fecha_eliminacion` is null then `hora_inicio` end",
    insert: false,
    update: false,
    select: false,
  })
  bloqueActivo?: string | null;

  @Column({ type: 'smallint', unsigned: true, nullable: true })
  invitados: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @Column({
    name: 'estado_reserva',
    type: 'enum',
    enum: EstadoReserva,
    default: EstadoReserva.PENDIENTE,
  })
  estadoReserva: EstadoReserva;

  @Column({
    name: 'motivo_cancelacion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivoCancelacion: string | null;

  @Column({ name: 'entregado_en', type: 'datetime', nullable: true })
  entregadoEn: Date | null;

  @Column({ name: 'entregado_por', type: 'int', nullable: true })
  entregadoPor: number | null;

  @Column({ name: 'recibido_en', type: 'datetime', nullable: true })
  recibidoEn: Date | null;

  @Column({ name: 'recibido_por', type: 'int', nullable: true })
  recibidoPor: number | null;

  @Column({
    name: 'observaciones_recepcion',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  observacionesRecepcion: string | null;

  @Column({
    name: 'fecha_solicitud',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fechaSolicitud: Date;
}

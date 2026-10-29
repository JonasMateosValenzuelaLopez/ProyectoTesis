import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { TipoResidencia } from '../../usuarios/entities/residencia.entity';

export enum EstadoSolicitudAcceso {
  PENDIENTE = 'Pendiente',
  APROBADA = 'Aprobada',
  RECHAZADA = 'Rechazada',
}

@Entity('solicitudes_acceso')
export class SolicitudAcceso extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ name: 'id_unidad', type: 'int', nullable: true })
  idUnidad: number | null;

  @ManyToOne(() => Unidad, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({ name: 'numero_unidad', type: 'varchar', length: 20 })
  numeroUnidad: string;

  @Column({
    name: 'tipo_residencia',
    type: 'enum',
    enum: TipoResidencia,
    default: TipoResidencia.PROPIETARIO,
  })
  tipoResidencia: TipoResidencia;

  @Column({ type: 'varchar', length: 20 })
  identificador: string;

  @Column({ type: 'char', length: 2, default: 'CL' })
  pais: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ name: 'primer_apellido', type: 'varchar', length: 50 })
  primerApellido: string;

  @Column({
    name: 'segundo_apellido',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  segundoApellido: string | null;

  @Column({ type: 'varchar', length: 100 })
  correo: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mensaje: string | null;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudAcceso,
    default: EstadoSolicitudAcceso.PENDIENTE,
  })
  estado: EstadoSolicitudAcceso;

  @Column({
    name: 'motivo_rechazo',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivoRechazo: string | null;

  @CreateDateColumn({ name: 'fecha_solicitud', type: 'datetime' })
  fechaSolicitud: Date;

  @Column({ name: 'fecha_resolucion', type: 'datetime', nullable: true })
  fechaResolucion: Date | null;

  @Column({ name: 'id_usuario_resolutor', type: 'int', nullable: true })
  idUsuarioResolutor: number | null;

  @Column({ name: 'id_usuario_creado', type: 'int', nullable: true })
  idUsuarioCreado: number | null;
}

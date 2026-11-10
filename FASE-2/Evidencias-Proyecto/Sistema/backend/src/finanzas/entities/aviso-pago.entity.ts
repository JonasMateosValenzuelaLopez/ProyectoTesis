import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { columnaMonto } from '../../common/utils/monto';
import { CobroUnidad } from './cobro-unidad.entity';

export enum MetodoPago {
  TRANSFERENCIA = 'Transferencia',
  EFECTIVO = 'Efectivo',
}

export enum EstadoAviso {
  PENDIENTE = 'Pendiente',
  VALIDADO = 'Validado',
  RECHAZADO = 'Rechazado',
}

@Entity('cobros_avisos_pago')
export class AvisoPago extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_aviso' })
  idAviso: number;

  @Column({ name: 'id_cobro_unidad', type: 'int' })
  idCobroUnidad: number;

  @ManyToOne(() => CobroUnidad, (cobroUnidad) => cobroUnidad.avisos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_cobro_unidad' })
  cobroUnidad: CobroUnidad;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: columnaMonto,
  })
  monto: number;

  @Column({ type: 'enum', enum: MetodoPago, default: MetodoPago.TRANSFERENCIA })
  metodo: MetodoPago;

  @Column({ name: 'fecha_pago', type: 'date' })
  fechaPago: string;

  @Column({
    name: 'comprobante_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  comprobanteUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observacion: string | null;

  @Column({ type: 'enum', enum: EstadoAviso, default: EstadoAviso.PENDIENTE })
  estado: EstadoAviso;

  @Column({
    name: 'motivo_rechazo',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivoRechazo: string | null;

  @Column({ name: 'validado_por', type: 'int', nullable: true })
  validadoPor: number | null;

  @Column({ name: 'validado_en', type: 'datetime', nullable: true })
  validadoEn: Date | null;
}

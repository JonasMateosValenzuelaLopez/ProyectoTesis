import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum LugarPublicacion {
  MURO = 'Muro',
  MARKETPLACE = 'Marketplace',
}

export enum EstadoReporte {
  PENDIENTE = 'Pendiente',
  DESCARTADO = 'Descartado',
  ATENDIDO = 'Atendido',
}

@Entity('muro_reportes')
@Unique('uq_reporte_publicacion_usuario', [
  'tipoPublicacion',
  'idPublicacion',
  'idUsuario',
])
export class MuroReporte extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_reporte' })
  idReporte: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'tipo_publicacion', type: 'enum', enum: LugarPublicacion })
  tipoPublicacion: LugarPublicacion;

  @Column({ name: 'id_publicacion', type: 'int' })
  idPublicacion: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ type: 'varchar', length: 255 })
  motivo: string;

  @Column({
    type: 'enum',
    enum: EstadoReporte,
    default: EstadoReporte.PENDIENTE,
  })
  estado: EstadoReporte;

  @Column({ name: 'resuelto_por', type: 'int', nullable: true })
  resueltoPor: number | null;

  @Column({ name: 'resuelto_en', type: 'datetime', nullable: true })
  resueltoEn: Date | null;
}

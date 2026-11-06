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
import { MarketplacePublicacion } from './marketplace-publicacion.entity';

export enum EstadoSolicitudContacto {
  PENDIENTE = 'Pendiente',
  ACEPTADA = 'Aceptada',
  RECHAZADA = 'Rechazada',
}

@Entity('marketplace_solicitudes_contacto')
@Unique('uq_solicitud_contacto_producto_usuario', ['idProducto', 'idUsuario'])
export class MarketplaceSolicitudContacto extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  idSolicitud: number;

  @Column({ name: 'id_producto', type: 'int' })
  idProducto: number;

  @ManyToOne(() => MarketplacePublicacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_producto' })
  producto: MarketplacePublicacion | null;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  interesado: Usuario;

  @Column({ name: 'id_unidad', type: 'int', nullable: true })
  idUnidad: number | null;

  @ManyToOne(() => Unidad, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({
    type: 'enum',
    enum: EstadoSolicitudContacto,
    default: EstadoSolicitudContacto.PENDIENTE,
  })
  estado: EstadoSolicitudContacto;

  @Column({ name: 'respondida_en', type: 'datetime', nullable: true })
  respondidaEn: Date | null;

  @Column({ type: 'boolean', default: false })
  vista: boolean;
}

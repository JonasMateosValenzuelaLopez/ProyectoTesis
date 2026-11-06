import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { columnaMonto } from '../../common/utils/monto';
import { EstadoModeracion } from '../../muro/entities/muro-publicacion.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoAviso {
  VENDO = 'Vendo',
  SERVICIO = 'Servicio',
  BUSCO = 'Busco',
}

@Entity('marketplace_publicaciones')
export class MarketplacePublicacion extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_producto' })
  idProducto: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  autor: Usuario;

  @Column({ name: 'id_unidad', type: 'int', nullable: true })
  idUnidad: number | null;

  @ManyToOne(() => Unidad, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({ type: 'enum', enum: TipoAviso })
  tipo: TipoAviso;

  @Column({ type: 'varchar', length: 100 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: columnaMonto,
  })
  precio: number | null;

  @Column({ name: 'fecha_publicacion', type: 'datetime', nullable: true })
  fechaPublicacion: Date | null;

  @Column({ name: 'cerrado_en', type: 'datetime', nullable: true })
  cerradoEn: Date | null;

  @Column({
    name: 'estado_moderacion',
    type: 'enum',
    enum: EstadoModeracion,
    default: EstadoModeracion.PUBLICADA,
  })
  estadoModeracion: EstadoModeracion;

  @Column({ name: 'moderado_por', type: 'int', nullable: true })
  moderadoPor: number | null;

  @Column({ name: 'moderado_en', type: 'datetime', nullable: true })
  moderadoEn: Date | null;
}

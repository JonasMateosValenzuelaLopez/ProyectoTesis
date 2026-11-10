import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoPublicacion {
  COMUNICADO = 'Comunicado',
  NORMA = 'Norma',
  VECINO = 'Vecino',
}

export const TIPOS_OFICIALES = [
  TipoPublicacion.COMUNICADO,
  TipoPublicacion.NORMA,
];

export enum EstadoAprobacion {
  NO_REQUIERE = 'No requiere',
  PENDIENTE = 'Pendiente',
  APROBADA = 'Aprobada',
  RECHAZADA = 'Rechazada',
}

export enum EstadoModeracion {
  PUBLICADA = 'Publicada',
  OCULTA = 'Oculta',
}

@Entity('muro_publicaciones')
export class MuroPublicacion extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_publicacion' })
  idPublicacion: number;

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

  @Column({
    type: 'enum',
    enum: TipoPublicacion,
    default: TipoPublicacion.VECINO,
  })
  tipo: TipoPublicacion;

  @Column({ type: 'varchar', length: 150, nullable: true })
  titulo: string | null;

  @Column({ type: 'text' })
  contenido: string;

  @Column({
    name: 'estado_aprobacion',
    type: 'enum',
    enum: EstadoAprobacion,
    default: EstadoAprobacion.NO_REQUIERE,
  })
  estadoAprobacion: EstadoAprobacion;

  @Column({ name: 'aprobado_por', type: 'int', nullable: true })
  aprobadoPor: number | null;

  @Column({ name: 'aprobado_en', type: 'datetime', nullable: true })
  aprobadoEn: Date | null;

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

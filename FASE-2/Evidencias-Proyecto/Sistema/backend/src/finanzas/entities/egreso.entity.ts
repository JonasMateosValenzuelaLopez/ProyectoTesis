import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { columnaMonto } from '../../common/utils/monto';
import { CategoriaGasto } from './categoria-gasto.entity';

export enum EstadoVisado {
  NO_REQUIERE = 'No requiere',
  PENDIENTE = 'Pendiente',
  APROBADO = 'Aprobado',
  RECHAZADO = 'Rechazado',
}

@Entity('egresos')
export class Egreso extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_egreso' })
  idEgreso: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'id_categoria', type: 'int' })
  idCategoria: number;

  @ManyToOne(() => CategoriaGasto)
  @JoinColumn({ name: 'id_categoria' })
  categoria: CategoriaGasto;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: columnaMonto,
  })
  monto: number;

  @Column({ type: 'varchar', length: 255 })
  descripcion: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  proveedor: string | null;

  @Column({ name: 'fecha_egreso', type: 'date' })
  fechaEgreso: string;

  @Column({
    name: 'comprobante_url',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  comprobanteUrl: string | null;

  @Column({ name: 'requiere_visado', type: 'boolean', default: false })
  requiereVisado: boolean;

  @Column({
    name: 'estado_visado',
    type: 'enum',
    enum: EstadoVisado,
    default: EstadoVisado.NO_REQUIERE,
  })
  estadoVisado: EstadoVisado;

  @Column({ name: 'visado_por', type: 'int', nullable: true })
  visadoPor: number | null;

  @Column({ name: 'visado_en', type: 'datetime', nullable: true })
  visadoEn: Date | null;

  @Column({ name: 'creado_por', type: 'int', nullable: true })
  creadoPor: number | null;
}

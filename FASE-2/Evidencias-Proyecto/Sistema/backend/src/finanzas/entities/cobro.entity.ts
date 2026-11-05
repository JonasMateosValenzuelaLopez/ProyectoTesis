import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { columnaMonto } from '../../common/utils/monto';
import { CategoriaGasto } from './categoria-gasto.entity';
import { CobroUnidad } from './cobro-unidad.entity';

@Entity('cobros')
export class Cobro extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_cobro' })
  idCobro: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'id_categoria', type: 'int' })
  idCategoria: number;

  @ManyToOne(() => CategoriaGasto)
  @JoinColumn({ name: 'id_categoria' })
  categoria: CategoriaGasto;

  @Column({ type: 'varchar', length: 150 })
  concepto: string;

  @Column({ type: 'text', nullable: true })
  descripcion: string | null;

  @Column({
    name: 'monto_por_unidad',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: columnaMonto,
  })
  montoPorUnidad: number;

  @Column({ type: 'date' })
  periodo: string;

  @Column({ name: 'fecha_emision', type: 'date' })
  fechaEmision: string;

  @Column({ name: 'fecha_vencimiento', type: 'date' })
  fechaVencimiento: string;

  @Column({ type: 'boolean', default: false })
  extraordinario: boolean;

  @Column({ name: 'creado_por', type: 'int', nullable: true })
  creadoPor: number | null;

  @OneToMany(() => CobroUnidad, (cobroUnidad) => cobroUnidad.cobro)
  unidades: CobroUnidad[];
}

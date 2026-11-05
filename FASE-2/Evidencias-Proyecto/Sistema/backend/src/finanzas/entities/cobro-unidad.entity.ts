import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { columnaMonto } from '../../common/utils/monto';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { AvisoPago } from './aviso-pago.entity';
import { Cobro } from './cobro.entity';

export enum EstadoCobroUnidad {
  PENDIENTE = 'Pendiente',
  PAGADO = 'Pagado',
  EXENTO = 'Exento',
}

@Entity('cobro_unidades')
@Unique('uq_cobro_unidad', ['idCobro', 'idUnidad'])
export class CobroUnidad extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_cobro_unidad' })
  idCobroUnidad: number;

  @Column({ name: 'id_cobro', type: 'int' })
  idCobro: number;

  @ManyToOne(() => Cobro, (cobro) => cobro.unidades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_cobro' })
  cobro: Cobro;

  @Column({ name: 'id_unidad', type: 'int' })
  idUnidad: number;

  @ManyToOne(() => Unidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: columnaMonto,
  })
  monto: number;

  @Column({
    type: 'enum',
    enum: EstadoCobroUnidad,
    default: EstadoCobroUnidad.PENDIENTE,
  })
  estado: EstadoCobroUnidad;

  @Column({ name: 'pagado_marcado_en', type: 'datetime', nullable: true })
  pagadoMarcadoEn: Date | null;

  @Column({ name: 'pagado_marcado_por', type: 'int', nullable: true })
  pagadoMarcadoPor: number | null;

  @OneToMany(() => AvisoPago, (aviso) => aviso.cobroUnidad)
  avisos: AvisoPago[];
}

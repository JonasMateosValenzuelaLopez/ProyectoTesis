import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

@Entity('categorias_gasto')
@Unique('uq_categoria_red_nombre', ['idRed', 'nombre'])
export class CategoriaGasto extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  idCategoria: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;
}

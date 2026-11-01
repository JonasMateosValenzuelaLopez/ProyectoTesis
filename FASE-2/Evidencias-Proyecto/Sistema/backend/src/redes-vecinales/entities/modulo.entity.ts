import { Column, Entity, PrimaryColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { CodigoModulo } from '../../common/enums/modulo.enum';

@Entity('modulos')
export class Modulo extends EntidadAuditada {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  codigo: CodigoModulo;

  @Column({ type: 'varchar', length: 60 })
  nombre: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descripcion: string | null;
}

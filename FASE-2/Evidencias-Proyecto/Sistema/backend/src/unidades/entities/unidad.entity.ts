import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

// El número es único por comunidad (migración 003), también entre unidades
// eliminadas.
@Entity('unidades')
@Unique('uq_unidad_red_numero', ['idRed', 'numeroIdentificador'])
export class Unidad extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_unidad' })
  idUnidad: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'numero_identificador', type: 'varchar', length: 20 })
  numeroIdentificador: string;

  @Column({
    name: 'calle_pasaje',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  callePasaje: string | null;
}

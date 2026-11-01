import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum TipoUnidad {
  CASA = 'Casa',
  DEPARTAMENTO = 'Departamento',
}

@Entity('unidades')
@Unique('uq_unidad_red_numero', ['idRed', 'numeroIdentificador'])
export class Unidad extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_unidad' })
  idUnidad: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ name: 'numero_identificador', type: 'varchar', length: 20 })
  numeroIdentificador: string;

  @Column({ type: 'enum', enum: TipoUnidad, default: TipoUnidad.CASA })
  tipo: TipoUnidad;

  @Column({
    name: 'calle_pasaje',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  callePasaje: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  torre: string | null;

  @Column({ type: 'smallint', nullable: true })
  piso: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  manzana: string | null;

  @Column({ type: 'int', nullable: true })
  orden: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  estacionamiento: string | null;
}

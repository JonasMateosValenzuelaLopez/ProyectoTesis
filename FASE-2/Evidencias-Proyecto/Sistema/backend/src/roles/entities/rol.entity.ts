import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

@Entity('roles')
@Unique('uq_rol_nombre', ['nombreRol'])
export class Rol extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol: number;

  @Column({ name: 'nombre_rol', type: 'varchar', length: 50 })
  nombreRol: string;
}

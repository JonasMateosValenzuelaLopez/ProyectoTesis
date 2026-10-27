import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

@Entity('roles')
export class Rol extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  idRol: number;

  @Column({ name: 'nombre_rol', type: 'varchar', length: 50 })
  nombreRol: string;
}

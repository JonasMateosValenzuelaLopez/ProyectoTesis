import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { Rol } from '../../roles/entities/rol.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from './usuario.entity';

// Pertenencia de un usuario a una comunidad (red), con sus roles en ella.
// El índice único también cuenta las membresías eliminadas (ver
// SolicitudesAccesoService.aprobar).
@Entity('membresias_red')
@Unique('uq_membresia_usuario_red', ['idUsuario', 'idRed'])
export class Membresia extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_membresia' })
  idMembresia: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.membresias, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ name: 'id_unidad', type: 'int', nullable: true })
  idUnidad: number | null;

  @ManyToOne(() => Unidad, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @ManyToMany(() => Rol)
  @JoinTable({
    name: 'membresias_roles',
    joinColumn: { name: 'id_membresia', referencedColumnName: 'idMembresia' },
    inverseJoinColumn: { name: 'id_rol', referencedColumnName: 'idRol' },
  })
  roles: Rol[];

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @CreateDateColumn({ name: 'fecha_ingreso', type: 'datetime' })
  fechaIngreso: Date;
}

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RolUsuario } from '../../common/enums/rol.enum';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { Rol } from '../../roles/entities/rol.entity';
import { Usuario } from './usuario.entity';

@Entity('membresias')
@Unique('uq_membresia_usuario_red_rol', ['idUsuario', 'idRed', 'idRol'])
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

  @Column({ name: 'id_rol', type: 'int' })
  idRol: RolUsuario;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'id_rol' })
  rol: Rol;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @Column({ type: 'date' })
  desde: string;

  @Column({ type: 'date', nullable: true })
  hasta: string | null;
}

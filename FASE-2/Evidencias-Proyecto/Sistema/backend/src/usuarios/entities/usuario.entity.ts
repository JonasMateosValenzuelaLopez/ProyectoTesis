import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Membresia } from './membresia.entity';
import { Residencia } from './residencia.entity';

@Entity('usuarios')
@Unique('uq_usuario_identificador', ['pais', 'identificador'])
export class Usuario extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  idUsuario: number;

  @Column({ type: 'varchar', length: 20 })
  identificador: string;

  @Column({ type: 'char', length: 2, default: 'CL' })
  pais: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ name: 'primer_apellido', type: 'varchar', length: 50 })
  primerApellido: string;

  @Column({
    name: 'segundo_apellido',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  segundoApellido: string | null;

  @Column({ type: 'varchar', length: 100, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash?: string | null;

  @Column({
    name: 'password_actualizada_en',
    type: 'datetime',
    nullable: true,
  })
  passwordActualizadaEn: Date | null;

  @Column({ name: 'es_plataforma', type: 'boolean', default: false })
  esPlataforma: boolean;

  @Column({ type: 'boolean', default: false })
  bloqueado: boolean;

  @Column({
    name: 'motivo_bloqueo',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivoBloqueo: string | null;

  @OneToMany(() => Membresia, (membresia) => membresia.usuario)
  membresias: Membresia[];

  @OneToMany(() => Residencia, (residencia) => residencia.usuario)
  residencias: Residencia[];
}

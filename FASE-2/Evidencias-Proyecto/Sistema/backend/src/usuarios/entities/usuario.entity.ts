import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Membresia } from './membresia.entity';

@Entity('usuarios')
export class Usuario extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  idUsuario: number;

  // Formato normalizado: sin puntos, con guion y DV en mayúscula (12345678-K).
  @Column({ type: 'varchar', length: 12, unique: true })
  rut: string;

  @Column({ type: 'varchar', length: 50 })
  nombre: string;

  @Column({ name: 'apellido_paterno', type: 'varchar', length: 50 })
  apellidoPaterno: string;

  @Column({ name: 'apellido_materno', type: 'varchar', length: 50 })
  apellidoMaterno: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  correo: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  telefono: string | null;

  // Nunca se selecciona por defecto; usar addSelect cuando se necesite.
  // Opcional en el tipo porque en un find normal llega undefined.
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash?: string;

  // Los JWT emitidos antes de esta fecha dejan de ser válidos.
  @Column({
    name: 'password_actualizada_en',
    type: 'datetime',
    nullable: true,
  })
  passwordActualizadaEn: Date | null;

  @Column({ type: 'boolean', default: true })
  estado: boolean;

  @OneToMany(() => Membresia, (membresia) => membresia.usuario)
  membresias: Membresia[];
}

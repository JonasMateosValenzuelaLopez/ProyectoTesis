import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('vehiculos')
@Unique('uq_vehiculo_usuario_patente', ['idUsuario', 'patente'])
export class Vehiculo extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_vehiculo' })
  idVehiculo: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'id_unidad', type: 'int', nullable: true })
  idUnidad: number | null;

  @ManyToOne(() => Unidad, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad | null;

  @Column({ type: 'varchar', length: 10 })
  patente: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  marca: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  modelo: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  estacionamiento: string | null;
}

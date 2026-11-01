import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from './usuario.entity';

export enum TipoResidencia {
  PROPIETARIO = 'Propietario',
  ARRENDATARIO = 'Arrendatario',
}

@Entity('residencias')
export class Residencia extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_residencia' })
  idResidencia: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.residencias, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'id_unidad', type: 'int' })
  idUnidad: number;

  @ManyToOne(() => Unidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad;

  @Column({ type: 'enum', enum: TipoResidencia })
  tipo: TipoResidencia;

  @Column({ type: 'date' })
  desde: string;

  @Column({ type: 'date', nullable: true })
  hasta: string | null;
}

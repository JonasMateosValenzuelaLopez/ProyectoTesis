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
import { Usuario } from './usuario.entity';

export enum TipoResidencia {
  PROPIETARIO = 'Propietario',
  ARRENDATARIO = 'Arrendatario',
}

@Entity('residencias')
@Unique('uq_residencia_titular', ['idUnidad', 'titular'])
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

  @Column({ type: 'tinyint', nullable: true })
  titular: 1 | null;

  @Column({ type: 'date' })
  desde: string;

  @Column({ type: 'date', nullable: true })
  hasta: string | null;

  @Column({ name: 'fecha_guia_vista', type: 'datetime', nullable: true })
  fechaGuiaVista: Date | null;
}

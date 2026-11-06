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
import { Votacion } from './votacion.entity';

@Entity('votos')
@Unique('uq_voto_votacion_unidad', ['idVotacion', 'idUnidad'])
export class Voto extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_voto' })
  idVoto: number;

  @Column({ name: 'id_votacion', type: 'int' })
  idVotacion: number;

  @ManyToOne(() => Votacion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_votacion' })
  votacion: Votacion;

  @Column({ name: 'id_opcion', type: 'int' })
  idOpcion: number;

  @Column({ name: 'id_unidad', type: 'int' })
  idUnidad: number;

  @ManyToOne(() => Unidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;
}

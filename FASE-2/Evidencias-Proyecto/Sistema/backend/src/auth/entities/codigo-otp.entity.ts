import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('codigos_otp')
export class CodigoOtp extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_codigo' })
  idCodigo: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'codigo_hash', type: 'char', length: 64 })
  codigoHash: string;

  @Column({ type: 'datetime' })
  expira: Date;

  @Column({ type: 'boolean', default: false })
  usado: boolean;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  intentos: number;
}

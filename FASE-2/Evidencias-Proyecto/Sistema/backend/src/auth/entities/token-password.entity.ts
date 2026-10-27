import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoTokenPassword {
  RECUPERACION = 'Recuperacion',
  ACTIVACION = 'Activacion',
}

@Entity('tokens_password')
export class TokenPassword extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_token' })
  idToken: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({ name: 'token_hash', type: 'char', length: 64, unique: true })
  tokenHash: string;

  @Column({ type: 'enum', enum: TipoTokenPassword })
  tipo: TipoTokenPassword;

  @Column({ name: 'fecha_expiracion', type: 'datetime' })
  fechaExpiracion: Date;

  @Column({ name: 'fecha_uso', type: 'datetime', nullable: true })
  fechaUso: Date | null;
}

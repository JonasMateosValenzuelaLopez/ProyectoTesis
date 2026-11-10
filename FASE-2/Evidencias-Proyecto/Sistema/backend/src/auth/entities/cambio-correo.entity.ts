import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

@Entity('auth_cambios_correo')
export class CambioCorreo extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_cambio' })
  idCambio: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario;

  @Column({
    name: 'correo_nuevo',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  correoNuevo: string | null;

  @Column({ name: 'codigo_hash', type: 'char', length: 64 })
  codigoHash: string;

  @Column({ type: 'datetime' })
  expira: Date;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  intentos: number;

  @Column({ type: 'boolean', default: false })
  usado: boolean;

  @Column({ name: 'confirmado_en', type: 'datetime', nullable: true })
  confirmadoEn: Date | null;
}

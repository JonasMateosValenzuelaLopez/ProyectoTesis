import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum AmbitoBitacora {
  COMUNIDAD = 'Comunidad',
  PLATAFORMA = 'Plataforma',
}

@Entity('bitacora_auditoria')
export class BitacoraAuditoria extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_bitacora' })
  idBitacora: number;

  @Column({
    type: 'enum',
    enum: AmbitoBitacora,
    default: AmbitoBitacora.COMUNIDAD,
  })
  ambito: AmbitoBitacora;

  @Column({ name: 'id_red', type: 'int', nullable: true })
  idRed: number | null;

  @Column({ name: 'id_usuario', type: 'int', nullable: true })
  idUsuario: number | null;

  @Column({ type: 'varchar', length: 60 })
  accion: string;

  @Column({ type: 'varchar', length: 60 })
  entidad: string;

  @Column({ name: 'id_entidad', type: 'int', nullable: true })
  idEntidad: number | null;

  @Column({ type: 'simple-json', nullable: true })
  detalle: Record<string, unknown> | null;
}

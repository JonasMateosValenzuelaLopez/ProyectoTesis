import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum TipoRedVecinal {
  VILLA = 'Villa',
  CONDOMINIO = 'Condominio',
  EDIFICIO = 'Edificio',
}

@Entity('redes_vecinales')
export class RedVecinal extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_red' })
  idRed: number;

  @Column({ type: 'varchar', length: 100 })
  nombre: string;

  @Column({ type: 'enum', enum: TipoRedVecinal })
  tipo: TipoRedVecinal;

  @Column({ type: 'varchar', length: 150, nullable: true })
  direccion: string | null;

  @CreateDateColumn({ name: 'fecha_registro', type: 'datetime' })
  fechaRegistro: Date;
}

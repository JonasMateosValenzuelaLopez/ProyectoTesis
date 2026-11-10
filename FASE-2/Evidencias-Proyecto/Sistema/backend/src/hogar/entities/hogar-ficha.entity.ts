import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum TipoFicha {
  PINTURA = 'Pintura',
  GARANTIA = 'Garantía',
  MANTENCION = 'Mantención',
  MEDIDA = 'Medida',
  TECNICO = 'Técnico',
  OTRO = 'Otro',
}

@Entity('hogar_fichas')
export class HogarFicha extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_ficha' })
  idFicha: number;

  @Column({ name: 'id_unidad', type: 'int' })
  idUnidad: number;

  @ManyToOne(() => Unidad, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_unidad' })
  unidad: Unidad;

  @Column({ type: 'enum', enum: TipoFicha })
  tipo: TipoFicha;

  @Column({ type: 'varchar', length: 100 })
  titulo: string;

  @Column({ type: 'text', nullable: true })
  detalle: string | null;

  @Column({
    name: 'contacto_nombre',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  contactoNombre: string | null;

  @Column({
    name: 'contacto_telefono',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  contactoTelefono: string | null;

  @Column({ type: 'date', nullable: true })
  fecha: string | null;

  @Column({ name: 'fecha_vence', type: 'date', nullable: true })
  fechaVence: string | null;

  @Column({ name: 'creado_por', type: 'int', nullable: true })
  creadoPor: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por' })
  creador: Usuario | null;
}

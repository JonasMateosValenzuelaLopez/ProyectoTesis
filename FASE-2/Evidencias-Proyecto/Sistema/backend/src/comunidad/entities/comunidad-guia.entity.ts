import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { RedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export enum DiaSemana {
  LUNES = 'Lunes',
  MARTES = 'Martes',
  MIERCOLES = 'Miércoles',
  JUEVES = 'Jueves',
  VIERNES = 'Viernes',
  SABADO = 'Sábado',
  DOMINGO = 'Domingo',
}

@Entity('comunidad_guias')
export class ComunidadGuia extends EntidadAuditada {
  @PrimaryColumn({ name: 'id_red', type: 'int' })
  idRed: number;

  @ManyToOne(() => RedVecinal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_red' })
  red: RedVecinal;

  @Column({ type: 'varchar', length: 500, nullable: true })
  mensaje: string | null;

  @Column({
    name: 'basura_dias',
    type: 'set',
    enum: DiaSemana,
    nullable: true,
  })
  basuraDias: DiaSemana[] | null;

  @Column({
    name: 'basura_horario',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  basuraHorario: string | null;

  @Column({
    name: 'basura_lugar',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  basuraLugar: string | null;

  @Column({
    name: 'reciclaje_lugar',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  reciclajeLugar: string | null;

  @Column({
    name: 'reciclaje_detalle',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  reciclajeDetalle: string | null;

  @Column({ name: 'actualizado_por', type: 'int', nullable: true })
  actualizadoPor: number | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actualizado_por' })
  actualizador: Usuario | null;
}

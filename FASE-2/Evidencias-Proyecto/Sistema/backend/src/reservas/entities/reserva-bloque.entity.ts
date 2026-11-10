import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';
import { columnaHora } from './columna-hora';
import { EspacioComun } from './espacio-comun.entity';

@Entity('reservas_bloques')
@Unique('uq_bloque_espacio_inicio', ['idEspacio', 'horaInicio'])
export class ReservaBloque extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_bloque' })
  idBloque: number;

  @Column({ name: 'id_espacio', type: 'int' })
  idEspacio: number;

  @ManyToOne(() => EspacioComun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_espacio' })
  espacio: EspacioComun;

  @Column({ name: 'hora_inicio', type: 'time', transformer: columnaHora })
  horaInicio: string;

  @Column({ name: 'hora_fin', type: 'time', transformer: columnaHora })
  horaFin: string;
}

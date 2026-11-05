import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum TipoNotificacion {
  NUEVO_COBRO = 'Nuevo cobro',
  RECORDATORIO_MOROSIDAD = 'Recordatorio de morosidad',
  RECORDATORIO_VOTACION = 'Recordatorio de votación',
}

@Entity('notificaciones_enviadas')
export class NotificacionEnviada extends EntidadAuditada {
  @PrimaryGeneratedColumn({ name: 'id_notificacion' })
  idNotificacion: number;

  @Column({ name: 'id_red', type: 'int' })
  idRed: number;

  @Column({ type: 'enum', enum: TipoNotificacion })
  tipo: TipoNotificacion;

  @Column({ type: 'varchar', length: 150 })
  asunto: string;

  @Column({ name: 'id_cobro', type: 'int', nullable: true })
  idCobro: number | null;

  @Column({ name: 'id_votacion', type: 'int', nullable: true })
  idVotacion: number | null;

  @Column({ type: 'int', default: 0 })
  destinatarios: number;

  @Column({ name: 'enviado_por', type: 'int', nullable: true })
  enviadoPor: number | null;
}

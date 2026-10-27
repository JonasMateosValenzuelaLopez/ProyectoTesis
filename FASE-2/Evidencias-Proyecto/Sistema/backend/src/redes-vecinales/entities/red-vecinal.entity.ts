import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { EntidadAuditada } from '../../common/entities/entidad-auditada.entity';

export enum TipoRedVecinal {
  VILLA = 'Villa',
  CONDOMINIO = 'Condominio',
  EDIFICIO = 'Edificio',
}

export enum EstadoRedVecinal {
  ACTIVA = 'Activa',
  SUSPENDIDA = 'Suspendida',
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

  @Column({
    type: 'enum',
    enum: EstadoRedVecinal,
    default: EstadoRedVecinal.ACTIVA,
  })
  estado: EstadoRedVecinal;

  @Column({
    name: 'motivo_suspension',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  motivoSuspension: string | null;

  @Column({ name: 'creada_por', type: 'int', nullable: true })
  creadaPor: number | null;

  @Column({ name: 'ultima_actividad', type: 'datetime', nullable: true })
  ultimaActividad: Date | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  banco: string | null;

  @Column({ name: 'tipo_cuenta', type: 'varchar', length: 30, nullable: true })
  tipoCuenta: string | null;

  @Column({
    name: 'numero_cuenta',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  numeroCuenta: string | null;

  @Column({
    name: 'titular_cuenta',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  titularCuenta: string | null;

  @Column({
    name: 'identificador_titular',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  identificadorTitular: string | null;

  @Column({
    name: 'correo_transferencias',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  correoTransferencias: string | null;
}

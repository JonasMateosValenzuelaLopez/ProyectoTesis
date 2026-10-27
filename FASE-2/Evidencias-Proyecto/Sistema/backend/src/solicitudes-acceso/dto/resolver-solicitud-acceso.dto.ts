import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { EstadoSolicitudAcceso } from '../entities/solicitud-acceso.entity';

export class AprobarSolicitudAccesoDto {
  // Obligatorio solo si el número escrito no coincidió con ninguna unidad.
  @IsOptional()
  @IsInt()
  @IsPositive()
  idUnidad?: number;
}

export class RechazarSolicitudAccesoDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  motivo?: string;
}

export class ListarSolicitudesAccesoDto {
  @IsOptional()
  @IsEnum(EstadoSolicitudAcceso, {
    message: 'El estado debe ser Pendiente, Aprobada o Rechazada',
  })
  estado?: EstadoSolicitudAcceso;
}

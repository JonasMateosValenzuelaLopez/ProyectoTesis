import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { TipoResidencia } from '../../usuarios/entities/residencia.entity';
import { EstadoSolicitudAcceso } from '../entities/solicitud-acceso.entity';

export class AprobarSolicitudAccesoDto {
  @IsOptional()
  @IsInt({ message: 'La unidad no es válida' })
  @IsPositive({ message: 'La unidad no es válida' })
  idUnidad?: number;

  @IsOptional()
  @IsEnum(TipoResidencia, {
    message: 'El tipo de residencia debe ser Propietario o Arrendatario',
  })
  tipoResidencia?: TipoResidencia;
}

export class RechazarSolicitudAccesoDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El motivo debe ser texto' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo?: string;
}

export class ListarSolicitudesAccesoDto {
  @IsOptional()
  @IsEnum(EstadoSolicitudAcceso, {
    message: 'El estado debe ser Pendiente, Aprobada o Rechazada',
  })
  estado?: EstadoSolicitudAcceso;
}

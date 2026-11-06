import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  normalizarTextoLargo,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import { EsFecha } from '../../common/validators/fecha.validator';
import { MAX_BLOQUES_POR_ESPACIO, MAX_ESPACIOS } from '../reglas-reservas';

const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const MENSAJE_HORA = 'La hora debe tener el formato HH:MM';

export class BloqueDto {
  @Matches(FORMATO_HORA, { message: MENSAJE_HORA })
  horaInicio: string;

  @Matches(FORMATO_HORA, { message: MENSAJE_HORA })
  horaFin: string;
}

export class EspacioDto {
  @IsOptional()
  @IsInt({ message: 'El espacio indicado no existe' })
  @IsPositive({ message: 'El espacio indicado no existe' })
  idEspacio?: number;

  @Transform(recortar)
  @IsString({ message: 'El nombre del espacio es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del espacio es obligatorio' })
  @MaxLength(100, {
    message: 'El nombre de un espacio no puede superar 100 caracteres',
  })
  nombre: string;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(1000, {
    message: 'La descripción no puede superar 1000 caracteres',
  })
  descripcion?: string;

  @IsOptional()
  @IsInt({ message: 'La capacidad debe ser un número entero entre 1 y 1000' })
  @Min(1, { message: 'La capacidad debe ser un número entero entre 1 y 1000' })
  @Max(1000, {
    message: 'La capacidad debe ser un número entero entre 1 y 1000',
  })
  capacidad?: number;

  @IsArray({ message: 'Los horarios deben ser una lista' })
  @ArrayMaxSize(MAX_BLOQUES_POR_ESPACIO, {
    message: `Un espacio puede tener hasta ${MAX_BLOQUES_POR_ESPACIO} horarios`,
  })
  @ValidateNested({ each: true })
  @Type(() => BloqueDto)
  bloques: BloqueDto[];
}

export class GuardarEspaciosDto {
  @IsArray({ message: 'Los espacios comunes deben ser una lista' })
  @ArrayMaxSize(MAX_ESPACIOS, {
    message: `Puedes tener hasta ${MAX_ESPACIOS} espacios comunes`,
  })
  @ValidateNested({ each: true })
  @Type(() => EspacioDto)
  espacios: EspacioDto[];
}

export class DisponibilidadDto {
  @Type(() => Number)
  @IsInt({ message: 'Elige un espacio' })
  @IsPositive({ message: 'Elige un espacio' })
  idEspacio: number;

  @Transform(recortarOpcional)
  @EsFecha()
  fecha: string;
}

export class CrearReservaDto {
  @IsInt({ message: 'Elige un espacio' })
  @IsPositive({ message: 'Elige un espacio' })
  idEspacio: number;

  @IsInt({ message: 'Elige tu vivienda' })
  @IsPositive({ message: 'Elige tu vivienda' })
  idUnidad: number;

  @Transform(recortarOpcional)
  @EsFecha()
  fecha: string;

  @Matches(FORMATO_HORA, { message: 'Elige un horario' })
  horaInicio: string;

  @IsOptional()
  @IsInt({ message: 'Los invitados deben ser un número entero entre 0 y 1000' })
  @Min(0, {
    message: 'Los invitados deben ser un número entero entre 0 y 1000',
  })
  @Max(1000, {
    message: 'Los invitados deben ser un número entero entre 0 y 1000',
  })
  invitados?: number;
}

export class ListarReservasDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El espacio indicado no existe' })
  @IsPositive({ message: 'El espacio indicado no existe' })
  idEspacio?: number;
}

export class CancelarReservaDto {
  @Transform(recortar)
  @IsString({ message: 'Indica el motivo de la cancelación' })
  @IsNotEmpty({ message: 'Indica el motivo de la cancelación' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo: string;
}

export class RecibirEspacioDto {
  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'La observación debe ser texto' })
  @MaxLength(255, { message: 'La observación no puede superar 255 caracteres' })
  observaciones?: string;
}

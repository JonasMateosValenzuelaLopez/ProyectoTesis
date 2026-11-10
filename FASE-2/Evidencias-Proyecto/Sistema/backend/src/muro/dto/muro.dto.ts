import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { normalizarTextoLargo, recortar } from '../../common/utils/texto';
import {
  TIPOS_OFICIALES,
  TipoPublicacion,
} from '../entities/muro-publicacion.entity';

export class PublicarVecinoDto {
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'Escribe tu mensaje' })
  @IsNotEmpty({ message: 'Escribe tu mensaje' })
  @MinLength(5, { message: 'El mensaje debe tener al menos 5 caracteres' })
  @MaxLength(500, { message: 'El mensaje no puede superar 500 caracteres' })
  contenido: string;

  @IsOptional()
  @IsInt({ message: 'La unidad no es válida' })
  @IsPositive({ message: 'La unidad no es válida' })
  idUnidad?: number;
}

export class PublicarOficialDto {
  @IsIn(TIPOS_OFICIALES, { message: 'El tipo debe ser Comunicado o Norma' })
  tipo: TipoPublicacion;

  @Transform(recortar)
  @IsString({ message: 'El título es obligatorio' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(150, { message: 'El título no puede superar 150 caracteres' })
  titulo: string;

  @Transform(normalizarTextoLargo)
  @IsString({ message: 'El texto es obligatorio' })
  @IsNotEmpty({ message: 'El texto es obligatorio' })
  @MinLength(20, { message: 'El texto debe tener al menos 20 caracteres' })
  @MaxLength(5000, { message: 'El texto no puede superar 5000 caracteres' })
  contenido: string;
}

export class ReportarPublicacionDto {
  @Transform(recortar)
  @IsString({ message: 'Indica el motivo del reporte' })
  @IsNotEmpty({ message: 'Indica el motivo del reporte' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo: string;
}

export class PaginaMuroDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'antesDe debe ser un número entero' })
  @Min(1, { message: 'antesDe debe ser un número entero' })
  antesDe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limite debe ser un número entre 1 y 100' })
  @Min(1, { message: 'limite debe ser un número entre 1 y 100' })
  @Max(100, { message: 'limite debe ser un número entre 1 y 100' })
  limite?: number;
}

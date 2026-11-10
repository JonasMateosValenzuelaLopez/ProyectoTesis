import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { recortar, recortarOpcional } from '../../common/utils/texto';

export const FILTROS_PERSONAS = ['todas', 'bloqueadas', 'plataforma'] as const;

export type FiltroPersonas = (typeof FILTROS_PERSONAS)[number];

export class ListarPersonasDto {
  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'La búsqueda debe ser un texto' })
  @MinLength(2, { message: 'Escribe al menos 2 caracteres para buscar' })
  @MaxLength(100, { message: 'La búsqueda no puede superar 100 caracteres' })
  buscar?: string;

  @IsOptional()
  @IsIn(FILTROS_PERSONAS, {
    message: 'filtro debe ser todas, bloqueadas o plataforma',
  })
  filtro?: FiltroPersonas;

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

export class BloquearCuentaDto {
  @Transform(recortar)
  @IsString({ message: 'El motivo es obligatorio' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo: string;
}

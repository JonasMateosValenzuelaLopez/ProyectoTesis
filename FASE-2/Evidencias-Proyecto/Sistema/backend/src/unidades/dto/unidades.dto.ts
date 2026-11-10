import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar } from '../../common/utils/texto';

const enMayusculas = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CrearLoteUnidadesDto {
  @IsOptional()
  @Transform(enMayusculas)
  @Matches(/^[A-Z0-9]{1,3}$/, {
    message: 'La torre debe tener de 1 a 3 letras o números',
  })
  torre?: string;

  @IsOptional()
  @IsInt({ message: 'El piso inicial debe ser un número entre 1 y 99' })
  @Min(1, { message: 'El piso inicial debe ser un número entre 1 y 99' })
  @Max(99, { message: 'El piso inicial debe ser un número entre 1 y 99' })
  pisoDesde?: number;

  @IsOptional()
  @IsInt({ message: 'El piso final debe ser un número entre 1 y 99' })
  @Min(1, { message: 'El piso final debe ser un número entre 1 y 99' })
  @Max(99, { message: 'El piso final debe ser un número entre 1 y 99' })
  pisoHasta?: number;

  @IsOptional()
  @IsInt({ message: 'Los departamentos por piso deben ser entre 1 y 30' })
  @Min(1, { message: 'Los departamentos por piso deben ser entre 1 y 30' })
  @Max(30, { message: 'Los departamentos por piso deben ser entre 1 y 30' })
  porPiso?: number;

  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El grupo debe ser texto' })
  @IsNotEmpty({ message: 'Indica la hilera, pasaje o manzana' })
  @MaxLength(100, { message: 'El grupo no puede superar 100 caracteres' })
  grupo?: string;

  @IsOptional()
  @IsInt({ message: 'El número inicial debe ser un entero entre 1 y 99999' })
  @Min(1, { message: 'El número inicial debe ser un entero entre 1 y 99999' })
  @Max(99999, {
    message: 'El número inicial debe ser un entero entre 1 y 99999',
  })
  desde?: number;

  @IsOptional()
  @IsInt({ message: 'El número final debe ser un entero entre 1 y 99999' })
  @Min(1, { message: 'El número final debe ser un entero entre 1 y 99999' })
  @Max(99999, { message: 'El número final debe ser un entero entre 1 y 99999' })
  hasta?: number;
}

export class EditarUnidadDto {
  @Transform(recortar)
  @IsString({ message: 'El número es obligatorio' })
  @IsNotEmpty({ message: 'El número es obligatorio' })
  @MaxLength(20, { message: 'El número no puede superar 20 caracteres' })
  @Matches(/^[A-Za-z0-9-]+$/, {
    message: 'El número solo puede tener letras, números y guiones',
  })
  numeroIdentificador: string;
}

export class CambiarTitularDto {
  @IsInt({ message: 'Elige al titular de la vivienda' })
  @IsPositive({ message: 'Elige al titular de la vivienda' })
  idUsuario: number;
}

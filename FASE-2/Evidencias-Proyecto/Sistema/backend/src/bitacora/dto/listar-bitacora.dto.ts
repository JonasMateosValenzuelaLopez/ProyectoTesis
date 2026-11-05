import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { RolUsuario } from '../../common/enums/rol.enum';

export class ListarBitacoraDto {
  @IsOptional()
  @Type(() => Number)
  @IsEnum(RolUsuario, { message: 'El cargo indicado no existe' })
  rol?: RolUsuario;

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

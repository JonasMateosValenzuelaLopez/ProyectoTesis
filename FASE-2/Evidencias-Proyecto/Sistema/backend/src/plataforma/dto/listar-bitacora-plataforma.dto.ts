import { Type } from 'class-transformer';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export const SIN_COMUNIDAD = 'ninguna';

export class ListarBitacoraPlataformaDto {
  @IsOptional()
  @Matches(/^([1-9]\d{0,9}|ninguna)$/, {
    message: 'comunidad debe ser el id de una comunidad o "ninguna"',
  })
  comunidad?: string;

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

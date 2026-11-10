import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { recortarOpcional } from '../utils/texto';

export class DecidirDto {
  @IsBoolean({ message: 'aprobado debe ser true o false' })
  aprobado: boolean;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El comentario debe ser texto' })
  @MaxLength(255, { message: 'El comentario no puede superar 255 caracteres' })
  comentario?: string;
}

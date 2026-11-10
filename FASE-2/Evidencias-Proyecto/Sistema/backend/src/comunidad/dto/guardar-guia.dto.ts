import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  normalizarTextoLargo,
  recortarOpcional,
} from '../../common/utils/texto';
import { DiaSemana } from '../entities/comunidad-guia.entity';

export class GuardarGuiaDto {
  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'El mensaje debe ser texto' })
  @MaxLength(500, { message: 'El mensaje no puede superar 500 caracteres' })
  mensaje?: string;

  @IsOptional()
  @IsArray({ message: 'Los días de basura deben ser una lista' })
  @ArrayUnique({ message: 'No repitas días de basura' })
  @IsEnum(DiaSemana, {
    each: true,
    message:
      'Cada día debe ser Lunes, Martes, Miércoles, Jueves, Viernes, Sábado o Domingo',
  })
  basuraDias?: DiaSemana[];

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El horario de basura debe ser texto' })
  @MaxLength(60, {
    message: 'El horario de basura no puede superar 60 caracteres',
  })
  basuraHorario?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El lugar de basura debe ser texto' })
  @MaxLength(150, {
    message: 'El lugar de basura no puede superar 150 caracteres',
  })
  basuraLugar?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El lugar de reciclaje debe ser texto' })
  @MaxLength(150, {
    message: 'El lugar de reciclaje no puede superar 150 caracteres',
  })
  reciclajeLugar?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El detalle de reciclaje debe ser texto' })
  @MaxLength(255, {
    message: 'El detalle de reciclaje no puede superar 255 caracteres',
  })
  reciclajeDetalle?: string;
}

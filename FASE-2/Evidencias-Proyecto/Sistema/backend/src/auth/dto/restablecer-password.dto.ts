import { applyDecorators } from '@nestjs/common';
import {
  IsByteLength,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export const EsPasswordNueva = () =>
  applyDecorators(
    IsString({ message: 'La contraseña es obligatoria' }),
    MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
    IsByteLength(0, 72, {
      message:
        'La contraseña no puede superar 72 caracteres (las tildes y la ñ cuentan doble)',
    }),
    Matches(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, {
      message: 'La contraseña debe incluir al menos una letra',
    }),
    Matches(/\d/, { message: 'La contraseña debe incluir al menos un número' }),
  );

export class RestablecerPasswordDto {
  @IsString({ message: 'El enlace no es válido o ya expiró' })
  @Length(43, 43, { message: 'El enlace no es válido o ya expiró' })
  @Matches(/^[\w-]+$/, { message: 'El enlace no es válido o ya expiró' })
  token: string;

  @EsPasswordNueva()
  password: string;
}

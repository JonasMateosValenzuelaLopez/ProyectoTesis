import {
  IsByteLength,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';

export class RestablecerPasswordDto {
  // randomBytes(32) en base64url: siempre 43 caracteres de [A-Za-z0-9_-].
  @IsString()
  @Length(43, 43, { message: 'El enlace no es válido o ya expiró' })
  @Matches(/^[\w-]+$/, { message: 'El enlace no es válido o ya expiró' })
  token: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  // bcrypt solo usa los primeros 72 bytes: un límite en caracteres dejaría
  // pasar contraseñas con tildes o ñ que se truncarían sin aviso.
  @IsByteLength(0, 72, {
    message:
      'La contraseña no puede superar 72 caracteres (las tildes y la ñ cuentan doble)',
  })
  @Matches(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, {
    message: 'La contraseña debe incluir al menos una letra',
  })
  @Matches(/\d/, { message: 'La contraseña debe incluir al menos un número' })
  password: string;
}

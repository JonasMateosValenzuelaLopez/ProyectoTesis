import { Transform } from 'class-transformer';
import {
  IsByteLength,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { limpiarTelefono } from '../../common/utils/texto';
import { EsTelefono } from '../../common/validators/telefono.validator';
import { EsPasswordNueva } from './restablecer-password.dto';

export const MENSAJE_PASSWORD_ACTUAL_INCORRECTA =
  'La contraseña actual no es correcta';

export class SolicitarCambioCorreoDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString({ message: 'Escribe tu nuevo correo' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100, { message: 'El correo no puede superar 100 caracteres' })
  correo: string;
}

export class ConfirmarCambioCorreoDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s/g, '') : value,
  )
  @IsString({ message: 'El código debe tener 6 dígitos' })
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}

export class ActualizarTelefonoDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? (limpiarTelefono({ value }) ?? null) : value,
  )
  @IsDefined({
    message: 'Indica el teléfono, o null para quitarlo',
  })
  @ValidateIf((dto: ActualizarTelefonoDto) => dto.telefono !== null)
  @IsString({ message: 'El teléfono debe tener el formato +56912345678' })
  @EsTelefono()
  @MaxLength(15, { message: 'El teléfono debe tener el formato +56912345678' })
  telefono: string | null;
}

export class CambiarPasswordDto {
  @IsString({ message: 'Escribe tu contraseña actual' })
  @IsNotEmpty({ message: 'Escribe tu contraseña actual' })
  @IsByteLength(0, 72, { message: MENSAJE_PASSWORD_ACTUAL_INCORRECTA })
  passwordActual: string;

  @EsPasswordNueva()
  passwordNueva: string;
}

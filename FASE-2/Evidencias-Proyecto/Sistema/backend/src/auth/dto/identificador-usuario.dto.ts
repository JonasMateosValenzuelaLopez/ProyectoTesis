import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, ValidateIf } from 'class-validator';
import { EsRut, NormalizarRut } from '../../common/validators/rut.validator';

/**
 * Identifica a un usuario por RUT (app móvil) o por correo (panel web).
 * Si vienen ambos, se usa el RUT.
 */
export class IdentificadorUsuarioDto {
  @ValidateIf(
    (o: IdentificadorUsuarioDto) =>
      o.rut !== undefined || o.correo === undefined,
  )
  @NormalizarRut()
  @IsString({ message: 'Debes ingresar tu RUT o tu correo' })
  @EsRut()
  rut?: string;

  @ValidateIf(
    (o: IdentificadorUsuarioDto) =>
      o.correo !== undefined || o.rut === undefined,
  )
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  correo?: string;
}

import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  EsIdentificador,
  NormalizarIdentificador,
  NormalizarPais,
} from '../../common/validators/identificador.validator';

export class IdentificadorUsuarioDto {
  @ValidateIf(
    (o: IdentificadorUsuarioDto) =>
      o.identificador !== undefined || o.correo === undefined,
  )
  @NormalizarIdentificador()
  @IsString({
    message: 'Debes ingresar tu RUT, documento de identidad o correo',
  })
  @EsIdentificador()
  identificador?: string;

  @IsOptional()
  @NormalizarPais()
  @Matches(/^[A-Z]{2}$/, { message: 'El país no es válido' })
  pais?: string;

  @ValidateIf(
    (o: IdentificadorUsuarioDto) =>
      o.correo !== undefined || o.identificador === undefined,
  )
  @Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const correo = value.trim().toLowerCase();
    return correo || undefined;
  })
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  correo?: string;
}

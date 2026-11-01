import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';
import { IdentificadorUsuarioDto } from './identificador-usuario.dto';

export class VerificarCodigoDto extends IdentificadorUsuarioDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\s/g, '') : value,
  )
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo: string;
}

import { IsByteLength, IsNotEmpty, IsString } from 'class-validator';
import { IdentificadorUsuarioDto } from './identificador-usuario.dto';

export class LoginDto extends IdentificadorUsuarioDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsByteLength(0, 72, { message: 'Credenciales inválidas' })
  password: string;
}

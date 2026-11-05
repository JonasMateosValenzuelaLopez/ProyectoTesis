import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { recortar } from '../../common/utils/texto';

export class SuspenderComunidadDto {
  @Transform(recortar)
  @IsString({ message: 'El motivo es obligatorio' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo: string;
}

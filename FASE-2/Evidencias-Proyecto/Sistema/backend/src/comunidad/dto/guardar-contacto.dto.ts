import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  quitarEspacios,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import { EsTelefono } from '../../common/validators/telefono.validator';

export class GuardarContactoDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El detalle debe ser texto' })
  @MaxLength(150, { message: 'El detalle no puede superar 150 caracteres' })
  detalle?: string;

  @Transform(quitarEspacios)
  @IsString({ message: 'El teléfono es obligatorio' })
  @EsTelefono()
  telefono: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El horario debe ser texto' })
  @MaxLength(100, { message: 'El horario no puede superar 100 caracteres' })
  horario?: string;

  @IsOptional()
  @IsBoolean({ message: 'visible debe ser true o false' })
  visible?: boolean;
}

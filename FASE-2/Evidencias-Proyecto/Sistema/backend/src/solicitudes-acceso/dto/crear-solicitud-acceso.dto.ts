import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { recortar, recortarOpcional } from '../../common/utils/texto';
import {
  EsIdentificador,
  NormalizarIdentificador,
  NormalizarPais,
} from '../../common/validators/identificador.validator';
import { TipoResidencia } from '../../usuarios/entities/residencia.entity';

export class CrearSolicitudAccesoDto {
  @IsInt({ message: 'Debes seleccionar tu comunidad' })
  @IsPositive({ message: 'Debes seleccionar tu comunidad' })
  idRed: number;

  @NormalizarIdentificador()
  @IsString({ message: 'El RUT o documento de identidad es obligatorio' })
  @EsIdentificador()
  identificador: string;

  @IsOptional()
  @NormalizarPais()
  @Matches(/^[A-Z]{2}$/, { message: 'El país no es válido' })
  pais?: string;

  @Transform(recortar)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede superar 50 caracteres' })
  nombre: string;

  @Transform(recortar)
  @IsString({ message: 'El primer apellido es obligatorio' })
  @IsNotEmpty({ message: 'El primer apellido es obligatorio' })
  @MaxLength(50, {
    message: 'El primer apellido no puede superar 50 caracteres',
  })
  primerApellido: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El segundo apellido debe ser texto' })
  @MaxLength(50, {
    message: 'El segundo apellido no puede superar 50 caracteres',
  })
  segundoApellido?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100, { message: 'El correo no puede superar 100 caracteres' })
  correo: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @Matches(/^\+?\d{8,14}$/, { message: 'El teléfono no es válido' })
  telefono?: string;

  @Transform(recortar)
  @IsString({ message: 'El número de casa o depto es obligatorio' })
  @IsNotEmpty({ message: 'El número de casa o depto es obligatorio' })
  @MaxLength(20, {
    message: 'El número de casa o depto no puede superar 20 caracteres',
  })
  numeroUnidad: string;

  @IsOptional()
  @IsEnum(TipoResidencia, {
    message: 'El tipo de residencia debe ser Propietario o Arrendatario',
  })
  tipoResidencia?: TipoResidencia;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El mensaje debe ser texto' })
  @MaxLength(255, { message: 'El mensaje no puede superar 255 caracteres' })
  mensaje?: string;
}

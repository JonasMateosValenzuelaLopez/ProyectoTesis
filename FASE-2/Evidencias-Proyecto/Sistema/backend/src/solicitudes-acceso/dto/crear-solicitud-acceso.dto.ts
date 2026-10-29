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
import {
  EsIdentificador,
  NormalizarIdentificador,
  NormalizarPais,
} from '../../common/validators/identificador.validator';
import { TipoResidencia } from '../../usuarios/entities/residencia.entity';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const recortarOpcional = ({ value }: { value: unknown }) => {
  const recortado = recortar({ value });
  return recortado === '' ? undefined : recortado;
};

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
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50)
  nombre: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El primer apellido es obligatorio' })
  @MaxLength(50)
  primerApellido: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString()
  @MaxLength(50)
  segundoApellido?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  correo: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @Matches(/^\+?\d{8,14}$/, { message: 'El teléfono no es válido' })
  telefono?: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El número de casa o depto es obligatorio' })
  @MaxLength(20)
  numeroUnidad: string;

  @IsOptional()
  @IsEnum(TipoResidencia, {
    message: 'El tipo de residencia debe ser Propietario o Arrendatario',
  })
  tipoResidencia?: TipoResidencia;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString()
  @MaxLength(255, { message: 'El mensaje no puede superar 255 caracteres' })
  mensaje?: string;
}

import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { RolUsuario } from '../../common/enums/rol.enum';
import {
  quitarEspacios,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import { EsFecha, NoPasada } from '../../common/validators/fecha.validator';
import {
  EsIdentificador,
  NormalizarIdentificador,
  NormalizarPais,
} from '../../common/validators/identificador.validator';
import { EsTelefono } from '../../common/validators/telefono.validator';
import { TipoResidencia } from '../../usuarios/entities/residencia.entity';

export const CARGOS_ASIGNABLES = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
  RolUsuario.PRESIDENTE,
  RolUsuario.CONSERJE,
];

export class InvitarResidenteDto {
  @IsOptional()
  @NormalizarPais()
  @Matches(/^[A-Z]{2}$/, { message: 'El país no es válido' })
  pais?: string;

  @NormalizarIdentificador()
  @IsString({ message: 'El RUT o documento de identidad es obligatorio' })
  @EsIdentificador()
  identificador: string;

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

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100, { message: 'El correo no puede superar 100 caracteres' })
  correo: string;

  @IsOptional()
  @Transform(quitarEspacios)
  @EsTelefono()
  telefono?: string;

  @IsInt({ message: 'Indica la unidad' })
  @IsPositive({ message: 'Indica la unidad' })
  idUnidad: number;

  @IsEnum(TipoResidencia, {
    message: 'La relación con la unidad debe ser Propietario o Arrendatario',
  })
  tipoResidencia: TipoResidencia;
}

export class AsignarCargoDto {
  @IsIn(CARGOS_ASIGNABLES, {
    message:
      'El cargo debe ser Administrador, Tesorero, Secretario, Presidente o Conserje',
  })
  idRol: RolUsuario;

  @IsOptional()
  @Transform(recortarOpcional)
  @EsFecha()
  @NoPasada()
  hasta?: string;
}

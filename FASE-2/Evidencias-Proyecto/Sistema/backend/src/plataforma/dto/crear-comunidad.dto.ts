import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidateNested,
  ValidationArguments,
} from 'class-validator';
import { CodigoModulo } from '../../common/enums/modulo.enum';
import { recortar, recortarOpcional } from '../../common/utils/texto';
import {
  EsIdentificador,
  NormalizarIdentificador,
  NormalizarPais,
} from '../../common/validators/identificador.validator';
import { TipoRedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { errorEstructura } from '../estructura-unidades';

const recortarLista = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
    : value;

function EstructuraSegunTipo() {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'estructuraSegunTipo',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message: (args: ValidationArguments) => {
          const dto = args.object as CrearComunidadDto;
          return errorEstructura(dto.tipo, dto.estructura) ?? '';
        },
      },
      validator: {
        validate: (_valor: unknown, args: ValidationArguments) => {
          const dto = args.object as CrearComunidadDto;
          return (
            !Object.values(TipoRedVecinal).includes(dto.tipo) ||
            !(dto.estructura instanceof EstructuraDto) ||
            errorEstructura(dto.tipo, dto.estructura) === null
          );
        },
      },
    });
  };
}

export class EstructuraDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z0-9]{1,3}$/, {
    message: 'La torre debe tener de 1 a 3 letras o números',
  })
  torre?: string;

  @IsOptional()
  @IsInt({ message: 'Los pisos deben ser un número entre 1 y 60' })
  @Min(1, { message: 'Los pisos deben ser un número entre 1 y 60' })
  @Max(60, { message: 'Los pisos deben ser un número entre 1 y 60' })
  pisos?: number;

  @IsOptional()
  @IsInt({ message: 'Los departamentos por piso deben ser entre 1 y 30' })
  @Min(1, { message: 'Los departamentos por piso deben ser entre 1 y 30' })
  @Max(30, { message: 'Los departamentos por piso deben ser entre 1 y 30' })
  porPiso?: number;

  @IsOptional()
  @IsInt({ message: 'Las casas del lado norte deben ser entre 1 y 200' })
  @Min(1, { message: 'Las casas del lado norte deben ser entre 1 y 200' })
  @Max(200, { message: 'Las casas del lado norte deben ser entre 1 y 200' })
  norte?: number;

  @IsOptional()
  @IsInt({ message: 'Las casas del lado sur deben ser entre 0 y 200' })
  @Min(0, { message: 'Las casas del lado sur deben ser entre 0 y 200' })
  @Max(200, { message: 'Las casas del lado sur deben ser entre 0 y 200' })
  sur?: number;

  @IsOptional()
  @IsInt({ message: 'Las manzanas deben ser entre 1 y 26' })
  @Min(1, { message: 'Las manzanas deben ser entre 1 y 26' })
  @Max(26, { message: 'Las manzanas deben ser entre 1 y 26' })
  manzanas?: number;

  @IsOptional()
  @IsInt({ message: 'Las casas por manzana deben ser entre 1 y 100' })
  @Min(1, { message: 'Las casas por manzana deben ser entre 1 y 100' })
  @Max(100, { message: 'Las casas por manzana deben ser entre 1 y 100' })
  casasPorManzana?: number;
}

export class ResponsableDto {
  @IsOptional()
  @NormalizarPais()
  @Matches(/^[A-Z]{2}$/, { message: 'El país no es válido' })
  pais?: string;

  @NormalizarIdentificador()
  @IsString({ message: 'El RUT o documento de identidad es obligatorio' })
  @EsIdentificador()
  identificador: string;

  @Transform(recortar)
  @IsString({ message: 'El nombre del responsable es obligatorio' })
  @IsNotEmpty({ message: 'El nombre del responsable es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede superar 50 caracteres' })
  nombre: string;

  @Transform(recortar)
  @IsString({ message: 'El primer apellido del responsable es obligatorio' })
  @IsNotEmpty({ message: 'El primer apellido del responsable es obligatorio' })
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
  @IsEmail({}, { message: 'El correo del responsable no es válido' })
  @MaxLength(100, { message: 'El correo no puede superar 100 caracteres' })
  correo: string;
}

export class CrearComunidadDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre de la comunidad es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de la comunidad es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @Transform(recortar)
  @IsString({ message: 'La dirección es obligatoria' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MaxLength(150, { message: 'La dirección no puede superar 150 caracteres' })
  direccion: string;

  @IsEnum(TipoRedVecinal, {
    message: 'El tipo debe ser Villa, Condominio o Edificio',
  })
  tipo: TipoRedVecinal;

  @IsObject({ message: 'Indica la estructura de las unidades' })
  @ValidateNested()
  @Type(() => EstructuraDto)
  @EstructuraSegunTipo()
  estructura: EstructuraDto;

  @IsArray({ message: 'Los módulos deben ser una lista' })
  @ArrayUnique({ message: 'No repitas módulos' })
  @IsEnum(CodigoModulo, { each: true, message: 'Hay un módulo que no existe' })
  modulos: CodigoModulo[];

  @IsOptional()
  @Transform(recortarLista)
  @IsArray({ message: 'Los espacios comunes deben ser una lista' })
  @ArrayMaxSize(20, { message: 'Puedes crear hasta 20 espacios comunes' })
  @ArrayUnique(
    (nombre: unknown) =>
      typeof nombre === 'string' ? nombre.toLowerCase() : nombre,
    { message: 'No repitas espacios comunes' },
  )
  @IsString({ each: true, message: 'Cada espacio común debe ser texto' })
  @IsNotEmpty({ each: true, message: 'Un espacio común no tiene nombre' })
  @MaxLength(100, {
    each: true,
    message: 'El nombre de un espacio no puede superar 100 caracteres',
  })
  espacios?: string[];

  @IsObject({ message: 'Indica los datos del responsable' })
  @ValidateNested()
  @Type(() => ResponsableDto)
  responsable: ResponsableDto;
}

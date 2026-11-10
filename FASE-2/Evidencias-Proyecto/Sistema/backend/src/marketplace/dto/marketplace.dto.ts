import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { normalizarTextoLargo, recortar } from '../../common/utils/texto';
import { PaginaMuroDto } from '../../muro/dto/muro.dto';
import { TipoAviso } from '../entities/marketplace-publicacion.entity';
import { PRECIO_MAXIMO } from '../reglas-marketplace';

const MENSAJE_TIPO = 'El tipo de aviso debe ser Vendo, Servicio o Busco';
const MENSAJE_PRECIO =
  'El precio debe ser un número entero entre 0 y 99.999.999';

function SinPrecioSiBusca() {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'sinPrecioSiBusca',
      target: objeto.constructor,
      propertyName: propiedad,
      options: { message: 'Un aviso de «Busco» no lleva precio' },
      validator: {
        validate: (_valor: unknown, args: ValidationArguments) =>
          (args.object as { tipo?: TipoAviso }).tipo !== TipoAviso.BUSCO,
      },
    });
  };
}

export class EditarAvisoDto {
  @Transform(recortar)
  @IsString({ message: 'El título es obligatorio' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MinLength(3, { message: 'El título debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El título no puede superar 100 caracteres' })
  titulo: string;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres' })
  descripcion?: string;

  @IsOptional()
  @SinPrecioSiBusca()
  @IsInt({ message: MENSAJE_PRECIO })
  @Min(0, { message: MENSAJE_PRECIO })
  @Max(PRECIO_MAXIMO, { message: MENSAJE_PRECIO })
  precio?: number | null;
}

export class PublicarAvisoDto extends EditarAvisoDto {
  @IsEnum(TipoAviso, { message: MENSAJE_TIPO })
  tipo: TipoAviso;

  @IsOptional()
  @IsInt({ message: 'La unidad no es válida' })
  @IsPositive({ message: 'La unidad no es válida' })
  idUnidad?: number;
}

export class PaginaAvisosDto extends PaginaMuroDto {
  @IsOptional()
  @IsEnum(TipoAviso, { message: MENSAJE_TIPO })
  tipo?: TipoAviso;
}

export class PedirContactoDto {
  @IsOptional()
  @IsInt({ message: 'La unidad no es válida' })
  @IsPositive({ message: 'La unidad no es válida' })
  idUnidad?: number;
}

export class ResponderSolicitudDto {
  @IsBoolean({ message: 'aceptada debe ser true o false' })
  aceptada: boolean;
}

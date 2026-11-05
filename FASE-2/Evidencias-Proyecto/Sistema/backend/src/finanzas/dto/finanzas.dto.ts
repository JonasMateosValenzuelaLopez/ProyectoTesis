import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
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
} from 'class-validator';
import {
  normalizarTextoLargo,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import {
  EsFecha,
  NoFutura,
  NoPasada,
} from '../../common/validators/fecha.validator';
import { MetodoPago } from '../entities/aviso-pago.entity';
import { MAX_MONTO } from '../reglas-finanzas';

const MENSAJE_MONTO = `El monto debe ser un número entero entre 1 y ${MAX_MONTO}`;

export class GuardarCategoriaDto {
  @Transform(recortar)
  @IsString({ message: 'El nombre de la categoría es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede superar 60 caracteres' })
  nombre: string;
}

export class EditarCategoriaDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El nombre de la categoría es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede superar 60 caracteres' })
  nombre?: string;

  @IsOptional()
  @IsBoolean({ message: 'activa debe ser true o false' })
  activa?: boolean;
}

export class CrearCobroDto {
  @IsInt({ message: 'Elige una categoría' })
  @IsPositive({ message: 'Elige una categoría' })
  idCategoria: number;

  @Transform(recortar)
  @IsString({ message: 'El concepto es obligatorio' })
  @IsNotEmpty({ message: 'El concepto es obligatorio' })
  @MaxLength(150, { message: 'El concepto no puede superar 150 caracteres' })
  concepto: string;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(2000, {
    message: 'La descripción no puede superar 2000 caracteres',
  })
  descripcion?: string;

  @IsInt({ message: MENSAJE_MONTO })
  @Min(1, { message: MENSAJE_MONTO })
  @Max(MAX_MONTO, { message: MENSAJE_MONTO })
  montoPorUnidad: number;

  @Transform(recortarOpcional)
  @EsFecha()
  @NoPasada()
  fechaVencimiento: string;

  @IsOptional()
  @IsBoolean({ message: 'extraordinario debe ser true o false' })
  extraordinario?: boolean;
}

export class EditarCobroDto {
  @IsOptional()
  @Transform(recortar)
  @IsString({ message: 'El concepto es obligatorio' })
  @IsNotEmpty({ message: 'El concepto es obligatorio' })
  @MaxLength(150, { message: 'El concepto no puede superar 150 caracteres' })
  concepto?: string;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(2000, {
    message: 'La descripción no puede superar 2000 caracteres',
  })
  descripcion?: string;

  @IsOptional()
  @IsInt({ message: MENSAJE_MONTO })
  @Min(1, { message: MENSAJE_MONTO })
  @Max(MAX_MONTO, { message: MENSAJE_MONTO })
  montoPorUnidad?: number;

  @IsOptional()
  @Transform(recortarOpcional)
  @EsFecha()
  fechaVencimiento?: string;
}

export class MarcarPagosDto {
  @IsArray({ message: 'Indica los cobros a marcar' })
  @ArrayNotEmpty({ message: 'Indica los cobros a marcar' })
  @ArrayMaxSize(500, { message: 'Puedes marcar hasta 500 cobros a la vez' })
  @ArrayUnique({ message: 'No repitas cobros' })
  @IsInt({ each: true, message: 'Los cobros indicados no son válidos' })
  @IsPositive({ each: true, message: 'Los cobros indicados no son válidos' })
  idsCobroUnidad: number[];

  @IsOptional()
  @IsEnum(MetodoPago, {
    message: 'El método debe ser Transferencia o Efectivo',
  })
  metodo?: MetodoPago;
}

export class RechazarAvisosDto {
  @IsArray({ message: 'Indica los avisos a rechazar' })
  @ArrayNotEmpty({ message: 'Indica los avisos a rechazar' })
  @ArrayMaxSize(100, { message: 'Puedes rechazar hasta 100 avisos a la vez' })
  @ArrayUnique({ message: 'No repitas avisos' })
  @IsInt({ each: true, message: 'Los avisos indicados no son válidos' })
  @IsPositive({ each: true, message: 'Los avisos indicados no son válidos' })
  idsAviso: number[];

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El motivo debe ser texto' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo?: string;
}

export class AvisarTransferenciaDto {
  @IsInt({ message: 'Indica tu unidad' })
  @IsPositive({ message: 'Indica tu unidad' })
  idUnidad: number;

  @IsInt({ message: MENSAJE_MONTO })
  @Min(1, { message: MENSAJE_MONTO })
  @Max(MAX_MONTO, { message: MENSAJE_MONTO })
  monto: number;

  @Transform(recortarOpcional)
  @EsFecha()
  @NoFutura()
  fechaPago: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'La nota debe ser texto' })
  @MaxLength(255, { message: 'La nota no puede superar 255 caracteres' })
  observacion?: string;
}

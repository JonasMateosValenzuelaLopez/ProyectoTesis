import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar, recortarOpcional } from '../../common/utils/texto';
import { EsFecha, NoFutura } from '../../common/validators/fecha.validator';
import { MAX_MONTO } from '../reglas-finanzas';

const MENSAJE_MONTO = `El monto debe ser un número entero entre 1 y ${MAX_MONTO}`;

export class RegistrarEgresoDto {
  @IsInt({ message: 'Elige una categoría' })
  @IsPositive({ message: 'Elige una categoría' })
  idCategoria: number;

  @IsInt({ message: MENSAJE_MONTO })
  @Min(1, { message: MENSAJE_MONTO })
  @Max(MAX_MONTO, { message: MENSAJE_MONTO })
  monto: number;

  @Transform(recortar)
  @IsString({ message: 'La descripción es obligatoria' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(255, { message: 'La descripción no puede superar 255 caracteres' })
  descripcion: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El proveedor debe ser texto' })
  @MaxLength(150, { message: 'El proveedor no puede superar 150 caracteres' })
  proveedor?: string;

  @Transform(recortarOpcional)
  @EsFecha()
  @NoFutura()
  fechaEgreso: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { message: 'El comprobante debe ser un enlace https' },
  )
  @MaxLength(255, { message: 'El enlace no puede superar 255 caracteres' })
  comprobanteUrl?: string;
}

export class SolicitarExencionDto {
  @IsInt({ message: 'Indica el cobro' })
  @IsPositive({ message: 'Indica el cobro' })
  idCobroUnidad: number;

  @Transform(recortar)
  @IsString({ message: 'El motivo es obligatorio' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MaxLength(255, { message: 'El motivo no puede superar 255 caracteres' })
  motivo: string;
}

export class ReporteDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'El periodo debe tener el formato AAAA-MM',
  })
  periodo?: string;
}

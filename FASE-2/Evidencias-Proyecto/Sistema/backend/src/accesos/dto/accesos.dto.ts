import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { recortar } from '../../common/utils/texto';
import {
  EsFecha,
  EsFechaHora,
  NoFutura,
} from '../../common/validators/fecha.validator';
import {
  EsIdentificador,
  NormalizarIdentificador,
} from '../../common/validators/identificador.validator';
import { CategoriaAcceso } from '../entities/invitacion.entity';

const MENSAJE_CATEGORIA =
  'La categoría debe ser Visita, Proveedor, Servicio o Delivery';
const MENSAJE_PATENTE =
  'La patente debe tener entre 4 y 8 letras o números, sin espacios';

const normalizarNombre = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const normalizarPatente = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') {
    return value;
  }
  const limpia = value.toUpperCase().replace(/[\s.·-]/g, '');
  return limpia === '' ? undefined : limpia;
};

class DatosVisitaDto {
  @Transform(normalizarNombre)
  @IsString({ message: 'Escribe el nombre de la visita' })
  @IsNotEmpty({ message: 'Escribe el nombre de la visita' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @IsOptional()
  @NormalizarIdentificador()
  @IsString({ message: 'El RUT no es válido' })
  @EsIdentificador()
  @MaxLength(12, { message: 'El RUT no es válido' })
  rut?: string;

  @IsEnum(CategoriaAcceso, { message: MENSAJE_CATEGORIA })
  categoria: CategoriaAcceso;

  @IsOptional()
  @Transform(normalizarPatente)
  @IsString({ message: MENSAJE_PATENTE })
  @Matches(/^[A-Z0-9]{4,8}$/, { message: MENSAJE_PATENTE })
  patente?: string;
}

export class CrearInvitacionDto extends DatosVisitaDto {
  @IsString({ message: 'Indica desde cuándo vale la invitación' })
  @EsFechaHora()
  validaDesde: string;

  @IsString({ message: 'Indica hasta cuándo vale la invitación' })
  @EsFechaHora()
  validaHasta: string;

  @IsOptional()
  @IsInt({ message: 'La unidad no es válida' })
  @IsPositive({ message: 'La unidad no es válida' })
  idUnidad?: number;
}

export class IngresoSinInvitacionDto extends DatosVisitaDto {
  @IsInt({ message: 'Indica la vivienda que visita' })
  @IsPositive({ message: 'Indica la vivienda que visita' })
  idUnidad: number;
}

export class CodigoInvitacionDto {
  @Transform(recortar)
  @IsString({ message: 'Escribe o escanea el código' })
  @IsNotEmpty({ message: 'Escribe o escanea el código' })
  @MaxLength(20, { message: 'El código no es válido' })
  codigo: string;
}

export class DecisionAccesoDto {
  @IsBoolean({ message: 'aprobado debe ser true o false' })
  aprobado: boolean;
}

export class CrearRetencionDto {
  @IsString({ message: 'Indica desde qué día retener los registros' })
  @EsFecha()
  @NoFutura()
  desde: string;

  @IsString({ message: 'Indica hasta qué día retener los registros' })
  @EsFecha()
  @NoFutura()
  hasta: string;

  @Transform(normalizarNombre)
  @IsString({ message: 'Explica el incidente que justifica la retención' })
  @MinLength(10, {
    message: 'Explica el incidente en al menos 10 caracteres',
  })
  @MaxLength(300, { message: 'El motivo no puede superar 300 caracteres' })
  motivo: string;
}

export class BusquedaPorteriaDto {
  @Transform(recortar)
  @IsString({ message: 'Escribe al menos 2 caracteres' })
  @MinLength(2, { message: 'Escribe al menos 2 caracteres' })
  @MaxLength(50, { message: 'La búsqueda no puede superar 50 caracteres' })
  q: string;
}

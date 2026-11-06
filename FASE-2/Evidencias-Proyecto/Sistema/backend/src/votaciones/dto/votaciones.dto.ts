import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  registerDecorator,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
} from 'class-validator';
import { esFechaValida, sumarDias } from '../../common/utils/fechas';
import {
  normalizarTextoLargo,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import { fechaHoy } from '../../common/utils/vigencia';
import { EsFecha, NoFutura } from '../../common/validators/fecha.validator';
import { TipoReunion } from '../entities/acta.entity';
import { TipoVotacion } from '../entities/votacion.entity';
import {
  MAX_ACUERDOS,
  MAX_DIAS_ABIERTA,
  MAX_OPCIONES,
  MIN_OPCIONES,
} from '../reglas-votaciones';

const MENSAJE_OPCIONES = `Indica entre ${MIN_OPCIONES} y ${MAX_OPCIONES} opciones`;
const MENSAJE_QUORUM = 'El quórum debe ser un porcentaje entre 1 y 100';

const reglaDeVotacion =
  (
    nombre: string,
    mensaje: string,
    validar: (valor: unknown, dto: CrearVotacionDto) => boolean,
  ) =>
  () =>
  (objeto: object, propiedad: string) => {
    registerDecorator({
      name: nombre,
      target: objeto.constructor,
      propertyName: propiedad,
      options: { message: mensaje },
      validator: {
        validate: (valor: unknown, argumentos: ValidationArguments) =>
          validar(valor, argumentos.object as CrearVotacionDto),
      },
    });
  };

const SinQuorumEnEncuesta = reglaDeVotacion(
  'sinQuorumEnEncuesta',
  'Una encuesta no tiene quórum',
  (_valor, dto) => dto.tipo !== TipoVotacion.ENCUESTA,
);

const PosteriorAHoy = reglaDeVotacion(
  'posteriorAHoy',
  'La fecha de cierre debe ser posterior a hoy',
  (valor) => !esFechaValida(valor) || valor > fechaHoy(),
);

const DentroDelPlazo = reglaDeVotacion(
  'dentroDelPlazo',
  `Una votación puede estar abierta hasta ${MAX_DIAS_ABIERTA} días`,
  (valor) =>
    !esFechaValida(valor) || valor <= sumarDias(fechaHoy(), MAX_DIAS_ABIERTA),
);

export class CrearVotacionDto {
  @IsEnum(TipoVotacion, { message: 'El tipo debe ser Votación o Encuesta' })
  tipo: TipoVotacion;

  @Transform(recortar)
  @IsString({ message: 'La pregunta es obligatoria' })
  @IsNotEmpty({ message: 'La pregunta es obligatoria' })
  @MaxLength(150, { message: 'La pregunta no puede superar 150 caracteres' })
  titulo: string;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'El detalle debe ser texto' })
  @MaxLength(2000, { message: 'El detalle no puede superar 2000 caracteres' })
  descripcion?: string;

  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((opcion) =>
          typeof opcion === 'string' ? opcion.trim() : opcion,
        )
      : value,
  )
  @IsArray({ message: MENSAJE_OPCIONES })
  @ArrayMinSize(MIN_OPCIONES, { message: MENSAJE_OPCIONES })
  @ArrayMaxSize(MAX_OPCIONES, { message: MENSAJE_OPCIONES })
  @IsString({ each: true, message: 'Cada opción debe ser texto' })
  @IsNotEmpty({ each: true, message: 'Una opción está vacía' })
  @MaxLength(150, {
    each: true,
    message: 'Una opción no puede superar 150 caracteres',
  })
  opciones: string[];

  @Transform(recortarOpcional)
  @EsFecha()
  @PosteriorAHoy()
  @DentroDelPlazo()
  fechaCierre: string;

  @ValidateIf(
    (dto: CrearVotacionDto) =>
      dto.tipo !== TipoVotacion.ENCUESTA ||
      (dto.quorum !== undefined && dto.quorum !== null),
  )
  @IsDefined({ message: 'Indica el quórum mínimo de la votación' })
  @IsInt({ message: MENSAJE_QUORUM })
  @Min(1, { message: MENSAJE_QUORUM })
  @Max(100, { message: MENSAJE_QUORUM })
  @SinQuorumEnEncuesta()
  quorum?: number;
}

export class VotarDto {
  @IsInt({ message: 'Elige una opción' })
  @IsPositive({ message: 'Elige una opción' })
  idOpcion: number;

  @IsInt({ message: 'Elige tu vivienda' })
  @IsPositive({ message: 'Elige tu vivienda' })
  idUnidad: number;
}

export class AcuerdoDto {
  @Transform(recortar)
  @IsString({ message: 'El acuerdo es obligatorio' })
  @IsNotEmpty({ message: 'El acuerdo es obligatorio' })
  @MaxLength(255, { message: 'Un acuerdo no puede superar 255 caracteres' })
  texto: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString({ message: 'El responsable debe ser texto' })
  @MaxLength(100, {
    message: 'El responsable no puede superar 100 caracteres',
  })
  responsable?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @EsFecha()
  plazo?: string;
}

export class GuardarActaDto {
  @IsEnum(TipoReunion, { message: 'Elige el tipo de reunión' })
  tipo: TipoReunion;

  @Transform(recortarOpcional)
  @EsFecha()
  @NoFutura()
  fecha: string;

  @Transform(recortar)
  @IsString({ message: 'El lugar es obligatorio' })
  @IsNotEmpty({ message: 'El lugar es obligatorio' })
  @MaxLength(100, { message: 'El lugar no puede superar 100 caracteres' })
  lugar: string;

  @IsOptional()
  @IsInt({ message: 'Las unidades presentes deben ser un número entero' })
  @Min(0, { message: 'Las unidades presentes no pueden ser negativas' })
  unidadesPresentes?: number;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString({ message: 'Los asistentes deben ser texto' })
  @MaxLength(5000, {
    message: 'Los asistentes no pueden superar 5000 caracteres',
  })
  asistentes?: string;

  @Transform(normalizarTextoLargo)
  @IsString({ message: 'Indica al menos un tema tratado' })
  @IsNotEmpty({ message: 'Indica al menos un tema tratado' })
  @MaxLength(5000, { message: 'Los temas no pueden superar 5000 caracteres' })
  temas: string;

  @IsArray({ message: 'Los acuerdos deben ser una lista' })
  @ArrayMaxSize(MAX_ACUERDOS, {
    message: `Un acta puede tener hasta ${MAX_ACUERDOS} acuerdos`,
  })
  @ValidateNested({ each: true })
  @Type(() => AcuerdoDto)
  acuerdos: AcuerdoDto[];
}

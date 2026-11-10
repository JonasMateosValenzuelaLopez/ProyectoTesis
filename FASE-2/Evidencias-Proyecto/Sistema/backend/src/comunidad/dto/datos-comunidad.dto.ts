import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { recortar, recortarOpcional } from '../../common/utils/texto';
import {
  EsIdentificador,
  NormalizarIdentificador,
} from '../../common/validators/identificador.validator';

export const TIPOS_CUENTA = [
  'Cuenta corriente',
  'Cuenta vista',
  'Cuenta RUT',
  'Cuenta de ahorro',
] as const;

export type TipoCuenta = (typeof TIPOS_CUENTA)[number];

export const MAX_UMBRAL_VISADO = 9_999_999_999;

const MENSAJE_UMBRAL = `El monto debe ser un número entero entre 1 y ${MAX_UMBRAL_VISADO}`;

const MENSAJE_NUMERO_CUENTA =
  'El número de cuenta debe tener al menos 4 dígitos y solo puede llevar dígitos y guiones';

const unirEspacios = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;

const unirEspaciosOpcional = ({ value }: { value: unknown }) => {
  const limpio = unirEspacios({ value });
  return limpio === '' ? undefined : limpio;
};

const limpiarNumeroCuenta = ({ value }: { value: unknown }) => {
  const limpio =
    typeof value === 'string' ? value.replace(/[\s.]/g, '') : value;
  return limpio === '' ? undefined : limpio;
};

const correoOpcional = ({ value }: { value: unknown }) => {
  const limpio = recortarOpcional({ value });
  return typeof limpio === 'string' ? limpio.toLowerCase() : limpio;
};

export class GuardarDatosComunidadDto {
  @Transform(unirEspacios)
  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  nombre: string;

  @Transform(recortar)
  @IsString({ message: 'La dirección es obligatoria' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  @MaxLength(150, { message: 'La dirección no puede superar 150 caracteres' })
  direccion: string;

  @IsOptional()
  @Transform(unirEspaciosOpcional)
  @IsString({ message: 'El banco debe ser texto' })
  @MaxLength(60, { message: 'El banco no puede superar 60 caracteres' })
  banco?: string | null;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsIn(TIPOS_CUENTA, {
    message: `El tipo de cuenta debe ser ${TIPOS_CUENTA.slice(0, -1).join(', ')} o ${TIPOS_CUENTA[TIPOS_CUENTA.length - 1]}`,
  })
  tipoCuenta?: TipoCuenta | null;

  @IsOptional()
  @Transform(limpiarNumeroCuenta)
  @IsString({ message: MENSAJE_NUMERO_CUENTA })
  @Matches(/^(?=(?:-*\d){4})\d(?:-?\d)*$/, { message: MENSAJE_NUMERO_CUENTA })
  @MaxLength(30, {
    message: 'El número de cuenta no puede superar 30 caracteres',
  })
  numeroCuenta?: string | null;

  @IsOptional()
  @Transform(unirEspaciosOpcional)
  @IsString({ message: 'El titular debe ser texto' })
  @MaxLength(100, { message: 'El titular no puede superar 100 caracteres' })
  titularCuenta?: string | null;

  @IsOptional()
  @NormalizarIdentificador()
  @IsString({ message: 'El RUT del titular no es válido' })
  @EsIdentificador({ message: 'El RUT del titular no es válido' })
  @MaxLength(12, { message: 'El RUT del titular no es válido' })
  identificadorTitular?: string | null;

  @IsOptional()
  @Transform(correoOpcional)
  @IsEmail({}, { message: 'El correo para comprobantes no es válido' })
  @MaxLength(100, {
    message: 'El correo para comprobantes no puede superar 100 caracteres',
  })
  correoTransferencias?: string | null;
}

export class CambiarUmbralVisadoDto {
  @IsInt({ message: MENSAJE_UMBRAL })
  @Min(1, { message: MENSAJE_UMBRAL })
  @Max(MAX_UMBRAL_VISADO, { message: MENSAJE_UMBRAL })
  umbralVisado: number;
}

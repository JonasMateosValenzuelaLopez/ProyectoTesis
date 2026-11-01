import { Transform } from 'class-transformer';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { esRutValido, normalizarRut } from './rut.validator';

export const PAIS_POR_DEFECTO = 'CL';

const paisDe = (objeto: unknown): string => {
  const pais = (objeto as { pais?: unknown } | undefined)?.pais;
  return typeof pais === 'string' && pais.trim()
    ? pais.trim().toUpperCase()
    : PAIS_POR_DEFECTO;
};

export function normalizarIdentificador(
  valor: string,
  pais: string,
): string | null {
  if (pais === 'CL') {
    return normalizarRut(valor);
  }
  const limpio = valor.replace(/[.\s]/g, '').toUpperCase();
  return /^(?=.*[A-Z0-9])[A-Z0-9-]{5,20}$/.test(limpio) ? limpio : null;
}

export function esIdentificadorValido(valor: string, pais: string): boolean {
  return pais === 'CL'
    ? esRutValido(valor)
    : normalizarIdentificador(valor, pais) !== null;
}

export function NormalizarIdentificador() {
  return Transform(({ value, obj }: { value: unknown; obj: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    if (!value.trim()) {
      return undefined;
    }
    return normalizarIdentificador(value, paisDe(obj)) ?? value;
  });
}

export function NormalizarPais() {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') {
      return value;
    }
    const pais = value.trim().toUpperCase();
    return pais || undefined;
  });
}

export function EsIdentificador(opciones?: ValidationOptions) {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'esIdentificador',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message: (args: ValidationArguments) =>
          paisDe(args.object) === 'CL'
            ? 'El RUT no es válido'
            : 'El identificador no es válido',
        ...opciones,
      },
      validator: {
        validate: (valor: unknown, args: ValidationArguments) =>
          typeof valor === 'string' &&
          esIdentificadorValido(valor, paisDe(args.object)),
      },
    });
  };
}

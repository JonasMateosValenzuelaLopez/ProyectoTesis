import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { CodigoError } from '../errores/codigo-error.enum';

export const MENSAJE_VALIDACION = 'Revisa los datos ingresados';

const MENSAJE_CAMPO_NO_PERMITIDO = 'Este campo no está permitido';

const PRIORIDAD = [
  'whitelistValidation',
  'isDefined',
  'isNotEmpty',
  'isString',
  'isInt',
  'isNumber',
  'isBoolean',
  'isEnum',
  'isIn',
  'isArray',
  'isObject',
];

const prioridad = (clave: string) => {
  const indice = PRIORIDAD.indexOf(clave);
  return indice === -1 ? PRIORIDAD.length : indice;
};

const mensajesDe = (error: ValidationError) =>
  Object.entries(error.constraints ?? {})
    .sort(([a], [b]) => prioridad(a) - prioridad(b))
    .map(([clave, mensaje]) =>
      clave === 'whitelistValidation' ? MENSAJE_CAMPO_NO_PERMITIDO : mensaje,
    );

export const mensajesDeValidacion = (errores: ValidationError[]): string[] =>
  errores.flatMap((error) => [
    ...mensajesDe(error),
    ...mensajesDeValidacion(error.children ?? []),
  ]);

export const camposDeValidacion = (
  errores: ValidationError[],
  prefijo = '',
): Record<string, string> =>
  errores.reduce<Record<string, string>>((campos, error) => {
    const ruta = prefijo ? `${prefijo}.${error.property}` : error.property;
    const [primero] = mensajesDe(error);
    return {
      ...(primero ? { [ruta]: primero } : {}),
      ...campos,
      ...camposDeValidacion(error.children ?? [], ruta),
    };
  }, {});

export const errorDeValidacion = (errores: ValidationError[]) =>
  new BadRequestException({
    codigo: CodigoError.VALIDACION,
    message: MENSAJE_VALIDACION,
    campos: camposDeValidacion(errores),
  });

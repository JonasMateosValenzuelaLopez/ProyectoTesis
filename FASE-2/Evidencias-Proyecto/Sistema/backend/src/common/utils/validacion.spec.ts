import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { errorDeValidacion, mensajesDeValidacion } from './validacion';

const error = (
  constraints: Record<string, string> | undefined,
  children: ValidationError[] = [],
): ValidationError => ({ property: 'campo', constraints, children });

describe('validacion', () => {
  it('debe juntar los mensajes de todos los campos', () => {
    expect(
      mensajesDeValidacion([
        error({ isString: 'El nombre es obligatorio' }),
        error({ isEmail: 'El correo no es válido', maxLength: 'Muy largo' }),
      ]),
    ).toEqual([
      'El nombre es obligatorio',
      'El correo no es válido',
      'Muy largo',
    ]);
  });

  it('debe entregar los mensajes de los objetos anidados sin anteponer la ruta', () => {
    expect(
      mensajesDeValidacion([
        error(undefined, [error({ esIdentificador: 'El RUT no es válido' })]),
      ]),
    ).toEqual(['El RUT no es válido']);
  });

  it('no debe repetir un mismo mensaje cuando fallan dos reglas con el mismo texto', () => {
    const excepcion = errorDeValidacion([
      error({
        isString: 'El motivo es obligatorio',
        isNotEmpty: 'El motivo es obligatorio',
      }),
    ]);

    expect(excepcion.getResponse()).toEqual(
      expect.objectContaining({ message: ['El motivo es obligatorio'] }),
    );
  });

  it('debe crear un 400 con la lista de mensajes', () => {
    const excepcion = errorDeValidacion([error({ isInt: 'Debe ser entero' })]);

    expect(excepcion).toBeInstanceOf(BadRequestException);
    expect(excepcion.getResponse()).toEqual({
      message: ['Debe ser entero'],
      error: 'Bad Request',
      statusCode: 400,
    });
  });
});

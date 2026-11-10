import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { CodigoError } from '../errores/codigo-error.enum';
import {
  camposDeValidacion,
  errorDeValidacion,
  mensajesDeValidacion,
} from './validacion';

const error = (
  property: string,
  constraints: Record<string, string> | undefined,
  children: ValidationError[] = [],
): ValidationError => ({ property, constraints, children });

describe('validacion', () => {
  describe('mensajesDeValidacion', () => {
    it('debe juntar los mensajes de todos los campos, también los anidados', () => {
      expect(
        mensajesDeValidacion([
          error('nombre', { isString: 'El nombre es obligatorio' }),
          error('responsable', undefined, [
            error('identificador', { esIdentificador: 'El RUT no es válido' }),
          ]),
        ]),
      ).toEqual(['El nombre es obligatorio', 'El RUT no es válido']);
    });

    it('debe traducir el aviso de campo no permitido', () => {
      expect(
        mensajesDeValidacion([
          error('idRed', {
            whitelistValidation: 'property idRed should not exist',
          }),
        ]),
      ).toEqual(['Este campo no está permitido']);
    });
  });

  describe('camposDeValidacion', () => {
    it('debe entregar un mensaje por campo, con la ruta de los objetos anidados', () => {
      expect(
        camposDeValidacion([
          error('correo', { isEmail: 'El correo no es válido' }),
          error('responsable', undefined, [
            error('identificador', { esIdentificador: 'El RUT no es válido' }),
          ]),
        ]),
      ).toEqual({
        correo: 'El correo no es válido',
        'responsable.identificador': 'El RUT no es válido',
      });
    });

    it('debe preferir el mensaje de dato faltante antes que el de largo', () => {
      expect(
        camposDeValidacion([
          error('motivo', {
            maxLength: 'El motivo no puede superar 255 caracteres',
            isNotEmpty: 'El motivo es obligatorio',
          }),
        ]),
      ).toEqual({ motivo: 'El motivo es obligatorio' });
    });
  });

  describe('errorDeValidacion', () => {
    it('debe crear un 400 con código, mensaje general y campos', () => {
      const excepcion = errorDeValidacion([
        error('pisos', { isInt: 'Los pisos deben ser un número' }),
      ]);

      expect(excepcion).toBeInstanceOf(BadRequestException);
      expect(excepcion.getResponse()).toEqual({
        codigo: CodigoError.VALIDACION,
        message: 'Revisa los datos ingresados',
        campos: { pisos: 'Los pisos deben ser un número' },
      });
    });
  });
});

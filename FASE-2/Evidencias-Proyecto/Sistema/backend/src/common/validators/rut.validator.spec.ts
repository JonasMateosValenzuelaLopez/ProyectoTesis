import { validate } from 'class-validator';
import {
  calcularDigitoVerificador,
  EsRut,
  esRutValido,
  normalizarRut,
} from './rut.validator';

describe('rut.validator', () => {
  describe('normalizarRut', () => {
    it.each([
      ['12.345.678-5', '12345678-5'],
      ['12345678-5', '12345678-5'],
      ['123456785', '12345678-5'],
      ['10.000.013-k', '10000013-K'],
      [' 12 345 678 5 ', '12345678-5'],
      ['1.234.567-4', '1234567-4'],
    ])('debe normalizar "%s" a "%s"', (entrada, esperado) => {
      expect(normalizarRut(entrada)).toBe(esperado);
    });

    it.each([
      ['vacío', ''],
      ['letras', 'abc'],
      ['cuerpo de 6 dígitos', '123.456-7'],
      ['cuerpo de 9 dígitos', '123.456.789-0'],
      ['DV distinto de dígito o K', '12.345.678-X'],
      ['K en el cuerpo', '1234K678-5'],
    ])('debe devolver null cuando el valor es %s', (_caso, entrada) => {
      expect(normalizarRut(entrada)).toBeNull();
    });
  });

  describe('calcularDigitoVerificador', () => {
    it.each([
      ['12345678', '5'],
      ['11111111', '1'],
      ['1234567', '4'],
      ['10000013', 'K'],
      ['10000004', '0'],
    ])('debe calcular el DV de %s como "%s"', (cuerpo, esperado) => {
      expect(calcularDigitoVerificador(cuerpo)).toBe(esperado);
    });
  });

  describe('esRutValido', () => {
    it.each(['12.345.678-5', '10000013-k', '10.000.004-0', '1234567-4'])(
      'debe aceptar el RUT válido %s',
      (rut) => {
        expect(esRutValido(rut)).toBe(true);
      },
    );

    it.each(['12.345.678-9', '10000013-0', '11.111.111-K'])(
      'debe rechazar %s cuando el DV no corresponde',
      (rut) => {
        expect(esRutValido(rut)).toBe(false);
      },
    );

    it('debe rechazar un valor sin forma de RUT', () => {
      expect(esRutValido('no-es-un-rut')).toBe(false);
    });
  });

  describe('EsRut', () => {
    class ConRut {
      @EsRut()
      rut: unknown;
    }

    class ConMensajePropio {
      @EsRut({ message: 'RUT del apoderado inválido' })
      rut: unknown;
    }

    const validarRut = (clase: new () => { rut: unknown }, rut: unknown) => {
      const objeto = new clase();
      objeto.rut = rut;
      return validate(objeto);
    };

    it('debe pasar la validación con un RUT válido', async () => {
      // Act
      const errores = await validarRut(ConRut, '12.345.678-5');

      // Assert
      expect(errores).toEqual([]);
    });

    it('debe fallar con el mensaje por defecto cuando el RUT es inválido', async () => {
      // Act
      const errores = await validarRut(ConRut, '12.345.678-9');

      // Assert
      expect(errores).toHaveLength(1);
      expect(errores[0].constraints).toEqual({ esRut: 'El RUT no es válido' });
    });

    it('debe fallar cuando el valor no es string', async () => {
      // Act
      const errores = await validarRut(ConRut, 123456785);

      // Assert
      expect(errores[0].constraints).toEqual({ esRut: 'El RUT no es válido' });
    });

    it('debe usar el mensaje personalizado cuando se entrega', async () => {
      // Act
      const errores = await validarRut(ConMensajePropio, 'abc');

      // Assert
      expect(errores[0].constraints).toEqual({
        esRut: 'RUT del apoderado inválido',
      });
    });
  });
});

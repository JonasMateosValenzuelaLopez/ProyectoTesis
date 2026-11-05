import {
  normalizarTextoLargo,
  quitarEspacios,
  recortar,
  recortarOpcional,
} from './texto';

describe('texto', () => {
  describe('recortar', () => {
    it('debe quitar los espacios de los extremos', () => {
      expect(recortar({ value: '  Ana  ' })).toBe('Ana');
    });

    it('debe dejar intactos los valores que no son texto', () => {
      expect(recortar({ value: 5 })).toBe(5);
    });
  });

  describe('recortarOpcional', () => {
    it.each([[''], ['   ']])(
      'debe convertir %j en undefined para tratarlo como no informado',
      (valor) => {
        expect(recortarOpcional({ value: valor })).toBeUndefined();
      },
    );

    it('debe dejar pasar null para que el DTO lo trate como vacío', () => {
      expect(recortarOpcional({ value: null })).toBeNull();
    });
  });

  describe('quitarEspacios', () => {
    it('debe quitar todos los espacios, también los del medio', () => {
      expect(quitarEspacios({ value: ' +56 9 1234 5678 ' })).toBe(
        '+56912345678',
      );
    });

    it('debe convertir un texto solo de espacios en undefined', () => {
      expect(quitarEspacios({ value: '   ' })).toBeUndefined();
    });
  });

  describe('normalizarTextoLargo', () => {
    it('debe unificar los saltos de línea de Windows y recortar los extremos', () => {
      expect(normalizarTextoLargo({ value: ' Hola\r\nvecinos\r ' })).toBe(
        'Hola\nvecinos',
      );
    });

    it('debe convertir un texto vacío en undefined', () => {
      expect(normalizarTextoLargo({ value: '\r\n  ' })).toBeUndefined();
    });
  });
});

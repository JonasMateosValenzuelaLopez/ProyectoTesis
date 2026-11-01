import {
  esIdentificadorValido,
  normalizarIdentificador,
} from './identificador.validator';

describe('normalizarIdentificador', () => {
  it('debe normalizar un RUT chileno con puntos y k minúscula', () => {
    expect(normalizarIdentificador('5.126.663-k', 'CL')).toBe('5126663-K');
  });

  it('debe quitar puntos y espacios y pasar a mayúsculas fuera de Chile', () => {
    expect(normalizarIdentificador(' 30.123.456 ', 'AR')).toBe('30123456');
    expect(normalizarIdentificador('abc-12345', 'PE')).toBe('ABC-12345');
  });

  it.each([
    ['muy corto', '1234'],
    ['muy largo', '1'.repeat(21)],
    ['con símbolos', '30/123'],
    ['formado solo por guiones', '-----'],
  ])(
    'debe devolver null para un identificador extranjero %s',
    (_caso, valor) => {
      expect(normalizarIdentificador(valor, 'AR')).toBeNull();
    },
  );
});

describe('esIdentificadorValido', () => {
  it('debe exigir el dígito verificador en Chile', () => {
    expect(esIdentificadorValido('12.345.678-5', 'CL')).toBe(true);
    expect(esIdentificadorValido('12.345.678-9', 'CL')).toBe(false);
  });

  it('debe aceptar cualquier formato alfanumérico válido fuera de Chile', () => {
    expect(esIdentificadorValido('12.345.678-9', 'AR')).toBe(true);
  });
});

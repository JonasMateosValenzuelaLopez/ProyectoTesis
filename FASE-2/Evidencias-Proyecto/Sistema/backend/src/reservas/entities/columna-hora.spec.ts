import { columnaHora } from './columna-hora';

describe('columnaHora', () => {
  it.each([
    ['12:00:00', '12:00'],
    ['08:30:00', '08:30'],
    ['23:59', '23:59'],
  ])('debe leer %s como %s', (valor, esperado) => {
    expect(columnaHora.from(valor)).toBe(esperado);
  });

  it('debe leer null como null', () => {
    expect(columnaHora.from(null)).toBeNull();
  });

  it.each(['12:00', null, undefined])(
    'debe escribir %s sin cambios',
    (valor) => {
      expect(columnaHora.to(valor)).toBe(valor);
    },
  );
});

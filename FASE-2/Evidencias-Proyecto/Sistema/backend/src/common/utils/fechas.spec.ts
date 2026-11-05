import { esFechaValida, mesesEntre, sumarMeses } from './fechas';

describe('esFechaValida', () => {
  it.each([['2026-11-04'], ['2024-02-29'], ['2026-12-31']])(
    'debe aceptar %s',
    (valor) => {
      expect(esFechaValida(valor)).toBe(true);
    },
  );

  it.each([
    ['2026-02-30'],
    ['2025-02-29'],
    ['2026-13-01'],
    ['2026-1-4'],
    ['04-11-2026'],
    ['2026-11-04T10:00:00Z'],
    [''],
    [20261104],
    [null],
  ])('debe rechazar %p', (valor) => {
    expect(esFechaValida(valor)).toBe(false);
  });
});

describe('sumarMeses', () => {
  it.each([
    ['2026-11-04', 12, '2027-11-04'],
    ['2026-11-04', 1, '2026-12-04'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-08-31', 6, '2027-02-28'],
    ['2026-12-15', 3, '2027-03-15'],
  ])('debe sumar a %s %i meses y dar %s', (fecha, meses, esperado) => {
    expect(sumarMeses(fecha, meses)).toBe(esperado);
  });
});

describe('mesesEntre', () => {
  it.each([
    ['2025-11-04', '2026-11-04', 12],
    ['2026-01-01', '2026-07-01', 6],
    ['2026-01-31', '2026-02-28', 1],
    ['2026-11-01', '2026-11-10', 0],
  ])('debe contar entre %s y %s %i meses', (desde, hasta, esperado) => {
    expect(mesesEntre(desde, hasta)).toBe(esperado);
  });
});

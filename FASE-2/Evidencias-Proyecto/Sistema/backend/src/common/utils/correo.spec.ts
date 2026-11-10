import { enmascararCorreo } from './correo';

describe('enmascararCorreo', () => {
  it.each([
    ['daniela.pino@gmail.com', 'd***o@gmail.com'],
    ['ab@x.cl', 'a***@x.cl'],
    ['a@x.cl', 'a***@x.cl'],
    ['raro@sub@dominio.cl', 'r***b@dominio.cl'],
    ['sin-arroba', '***'],
    ['@x.cl', '***'],
  ])('debe mostrar «%s» como «%s»', (correo, esperado) => {
    expect(enmascararCorreo(correo)).toBe(esperado);
  });
});

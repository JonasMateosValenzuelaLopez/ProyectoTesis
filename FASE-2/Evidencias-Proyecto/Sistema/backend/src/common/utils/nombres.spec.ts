import { nombreCompleto } from './nombres';

describe('nombreCompleto', () => {
  it('debe unir nombre y apellidos con un espacio', () => {
    expect(
      nombreCompleto({
        nombre: 'Carla',
        primerApellido: 'Soto',
        segundoApellido: 'Ríos',
      }),
    ).toBe('Carla Soto Ríos');
  });

  it('debe omitir el segundo apellido cuando no existe', () => {
    expect(
      nombreCompleto({
        nombre: 'Carla',
        primerApellido: 'Soto',
        segundoApellido: null,
      }),
    ).toBe('Carla Soto');
  });
});

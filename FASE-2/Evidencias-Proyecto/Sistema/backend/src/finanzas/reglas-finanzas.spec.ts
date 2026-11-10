import { EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import {
  estaAtrasado,
  fechaLegible,
  periodoActual,
  pesos,
} from './reglas-finanzas';

describe('reglas de finanzas', () => {
  it('debe usar el primer día del mes como periodo', () => {
    expect(periodoActual('2026-11-05')).toBe('2026-11-01');
  });

  it.each([
    [EstadoCobroUnidad.PENDIENTE, '2026-11-04', true],
    [EstadoCobroUnidad.PENDIENTE, '2026-11-05', false],
    [EstadoCobroUnidad.PENDIENTE, '2026-11-30', false],
    [EstadoCobroUnidad.PAGADO, '2026-10-10', false],
    [EstadoCobroUnidad.EXENTO, '2026-10-10', false],
  ])(
    'un cobro %s que vence el %s, ¿está atrasado el 2026-11-05? %s',
    (estado, fechaVencimiento, esperado) => {
      expect(estaAtrasado({ estado }, { fechaVencimiento }, '2026-11-05')).toBe(
        esperado,
      );
    },
  );

  it('debe formatear pesos chilenos sin decimales', () => {
    expect(pesos(45000)).toMatch(/^\$\s?45\.000$/);
  });

  it('debe mostrar la fecha como día-mes-año', () => {
    expect(fechaLegible('2026-11-10')).toBe('10-11-2026');
  });
});

import { IsNull, LessThanOrEqual, MoreThanOrEqual, Or } from 'typeorm';
import { condicionVigente, fechaHoy, horaActual } from './vigencia';

describe('fechaHoy', () => {
  it('debe usar la fecha de Chile con dos dígitos en mes y día', () => {
    expect(fechaHoy(new Date('2026-01-05T15:00:00.000Z'))).toBe('2026-01-05');
  });

  it('debe seguir en el día de Chile aunque en UTC ya sea el día siguiente', () => {
    expect(fechaHoy(new Date('2026-10-27T01:30:00.000Z'))).toBe('2026-10-26');
  });

  it('debe cambiar de día a la medianoche de Chile', () => {
    expect(fechaHoy(new Date('2026-07-15T04:00:00.000Z'))).toBe('2026-07-15');
    expect(fechaHoy(new Date('2026-07-15T03:59:00.000Z'))).toBe('2026-07-14');
  });
});

describe('condicionVigente', () => {
  it('debe exigir desde <= hoy y hasta nulo o >= hoy', () => {
    expect(condicionVigente('2026-10-26')).toEqual({
      desde: LessThanOrEqual('2026-10-26'),
      hasta: Or(IsNull(), MoreThanOrEqual('2026-10-26')),
    });
  });
});

describe('horaActual', () => {
  it('debe dar la hora de Chile en formato de 24 horas', () => {
    expect(horaActual(new Date('2026-11-05T21:07:00.000Z'))).toBe('18:07');
  });

  it('debe mostrar la medianoche como 00', () => {
    expect(horaActual(new Date('2026-07-15T04:05:00.000Z'))).toBe('00:05');
  });
});

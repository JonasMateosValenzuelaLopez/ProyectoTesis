import { validateSync } from 'class-validator';
import {
  EsFecha,
  EsFechaHora,
  esFechaHoraConZona,
  NoFutura,
  NoPasada,
} from './fecha.validator';

class ConFechaHora {
  @EsFechaHora()
  valor: unknown;
}

class ConFechas {
  @EsFecha()
  @NoFutura()
  hasta: unknown;

  @EsFecha()
  @NoPasada()
  desde: unknown;
}

const erroresDe = (objeto: object) =>
  validateSync(objeto).flatMap((e) => Object.keys(e.constraints ?? {}));

describe('validadores de fecha', () => {
  describe('esFechaHoraConZona', () => {
    it.each([
      ['2026-11-06T10:00Z'],
      ['2026-11-06T10:00:00Z'],
      ['2026-11-06T10:00:00.123Z'],
      ['2026-11-06T10:00:00-03:00'],
      ['2026-11-06T10:00:00+05:30'],
      ['2026-11-06T10:00:00+14:00'],
      ['2026-11-06T23:59:59Z'],
      ['2028-02-29T10:00Z'],
    ])('debe aceptar «%s»', (valor) => {
      expect(esFechaHoraConZona(valor)).toBe(true);
    });

    it.each([
      ['2026-02-30T10:00Z', 'un día que no existe'],
      ['2026-02-29T10:00Z', 'el 29 de febrero de un año no bisiesto'],
      ['2026-13-01T10:00Z', 'un mes que no existe'],
      ['2026-11-06T10:00', 'sin zona horaria'],
      ['2026-11-06', 'sin hora'],
      ['2026-11-06T24:00Z', 'las 24:00, que corre al día siguiente'],
      ['2026-11-06T23:60Z', 'minuto 60'],
      ['2026-11-06T23:59:60Z', 'segundo 60'],
      ['2026-11-06T10:00:00.1234Z', 'más de 3 decimales'],
      ['2026-11-06T10:00:00+0300', 'desfase sin dos puntos'],
      ['2026-11-06T10:00:00+24:00', 'desfase fuera de rango'],
      ['2026-11-06T10:00:00+03:60', 'minutos de desfase fuera de rango'],
      ['2026-11-06T10:00:00z', 'z minúscula'],
      ['2026-11-06T10:00:00Z\n', 'salto de línea al final'],
    ])('debe rechazar «%s» (%s)', (valor) => {
      expect(esFechaHoraConZona(valor)).toBe(false);
    });
  });

  describe('EsFechaHora', () => {
    it('debe aceptar una fecha y hora con zona', () => {
      expect(
        erroresDe(
          Object.assign(new ConFechaHora(), { valor: '2026-11-06T18:00:00Z' }),
        ),
      ).toEqual([]);
    });

    it.each([[20261106], [null], [undefined], ['mañana']])(
      'debe rechazar %p',
      (valor) => {
        expect(erroresDe(Object.assign(new ConFechaHora(), { valor }))).toEqual(
          ['esFechaHora'],
        );
      },
    );
  });

  describe('NoFutura y NoPasada', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-11-06T15:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe aceptar hoy en ambos casos', () => {
      expect(
        erroresDe(
          Object.assign(new ConFechas(), {
            hasta: '2026-11-06',
            desde: '2026-11-06',
          }),
        ),
      ).toEqual([]);
    });

    it('debe rechazar una fecha futura en NoFutura y una pasada en NoPasada', () => {
      expect(
        erroresDe(
          Object.assign(new ConFechas(), {
            hasta: '2026-11-07',
            desde: '2026-11-05',
          }),
        ),
      ).toEqual(['noFutura', 'noPasada']);
    });
  });
});

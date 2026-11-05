import { EstadoReserva, Reserva } from './entities/reserva.entity';
import {
  estadoVisible,
  momentoLocal,
  puedeCancelarResidente,
  seCruzan,
  ultimoDiaReservable,
  yaEmpezo,
} from './reglas-reservas';

const AHORA = new Date('2026-11-05T13:00:00.000Z');

const crearReserva = (cambios: Partial<Reserva> = {}) =>
  ({
    idReserva: 1,
    fechaReserva: '2026-11-06',
    horaInicio: '10:00',
    horaFin: '12:00',
    estadoReserva: EstadoReserva.APROBADA,
    entregadoEn: null,
    recibidoEn: null,
    ...cambios,
  }) as Reserva;

describe('reglas de reservas', () => {
  it('debe dar el momento en la hora de Chile', () => {
    expect(momentoLocal(AHORA)).toBe('2026-11-05 10:00');
  });

  it('debe permitir reservar hasta 13 días después de hoy', () => {
    expect(ultimoDiaReservable('2026-11-05')).toBe('2026-11-18');
  });

  describe('estadoVisible', () => {
    it.each([
      [{}, 'Aprobada'],
      [{ estadoReserva: EstadoReserva.CANCELADA }, 'Cancelada'],
      [{ entregadoEn: AHORA }, 'Entregado'],
      [{ entregadoEn: AHORA, recibidoEn: AHORA }, 'Devuelto'],
    ])('con %j debe mostrar %s', (cambios, esperado) => {
      expect(estadoVisible(crearReserva(cambios))).toBe(esperado);
    });
  });

  describe('yaEmpezo', () => {
    it.each([
      ['2026-11-05', '09:59', true],
      ['2026-11-05', '10:00', true],
      ['2026-11-05', '10:01', false],
      ['2026-11-04', '23:00', true],
      ['2026-11-06', '00:00', false],
    ])('el %s a las %s debe dar %s', (fechaReserva, horaInicio, esperado) => {
      expect(yaEmpezo({ fechaReserva, horaInicio }, AHORA)).toBe(esperado);
    });
  });

  describe('puedeCancelarResidente', () => {
    it.each([
      [{ fechaReserva: '2026-11-06', horaInicio: '10:00' }, true],
      [{ fechaReserva: '2026-11-06', horaInicio: '09:59' }, false],
      [
        { fechaReserva: '2026-11-08', estadoReserva: EstadoReserva.CANCELADA },
        false,
      ],
      [{ fechaReserva: '2026-11-08', entregadoEn: AHORA }, false],
    ])('con %j debe dar %s', (cambios, esperado) => {
      expect(puedeCancelarResidente(crearReserva(cambios), AHORA)).toBe(
        esperado,
      );
    });
  });

  describe('seCruzan', () => {
    it.each([
      ['10:00', '12:00', '11:00', '13:00', true],
      ['10:00', '12:00', '12:00', '14:00', false],
      ['10:00', '12:00', '08:00', '10:00', false],
      ['10:00', '12:00', '09:00', '13:00', true],
    ])(
      '%s-%s con %s-%s debe dar %s',
      (horaInicio, horaFin, otroInicio, otroFin, esperado) => {
        expect(
          seCruzan(
            { horaInicio, horaFin },
            { horaInicio: otroInicio, horaFin: otroFin },
          ),
        ).toBe(esperado);
      },
    );
  });
});

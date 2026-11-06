import { Invitacion } from './entities/invitacion.entity';
import {
  EstadoAutorizacion,
  RegistroAcceso,
  ViaAutorizacion,
} from './entities/registro-acceso.entity';
import {
  decisionAcceso,
  estadoInvitacion,
  generarCodigo,
  limitePendiente,
  normalizarCodigo,
  resultadoValidacion,
  separarNombre,
} from './reglas-accesos';

const AHORA = new Date('2026-11-06T15:00:00Z');

const crearInvitacion = (cambios: Partial<Invitacion> = {}) =>
  ({
    idInvitacion: 1,
    validaDesde: new Date('2026-11-06T14:00:00Z'),
    validaHasta: new Date('2026-11-06T18:00:00Z'),
    canceladaEn: null,
    ...cambios,
  }) as Invitacion;

const crearAcceso = (cambios: Partial<RegistroAcceso> = {}) =>
  ({
    idAcceso: 9,
    fechaIngreso: AHORA,
    fechaSalida: null,
    ...cambios,
  }) as RegistroAcceso;

describe('reglas-accesos', () => {
  describe('generarCodigo', () => {
    it('debe generar códigos EC-XXXX-XXXX sin caracteres ambiguos', () => {
      const codigos = Array.from({ length: 200 }, () => generarCodigo());

      for (const codigo of codigos) {
        expect(codigo).toMatch(/^EC-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
      }
      expect(new Set(codigos).size).toBe(200);
    });
  });

  describe('normalizarCodigo', () => {
    it.each([
      ['EC-ABCD-2345', 'EC-ABCD-2345'],
      ['ecabcd2345', 'EC-ABCD-2345'],
      [' ec abcd 2345 ', 'EC-ABCD-2345'],
      ['ABCD2345', 'EC-ABCD-2345'],
      ['ECAB2345', 'EC-ECAB-2345'],
      ['EC-ECAB-2345', 'EC-ECAB-2345'],
      ['ececab2345', 'EC-ECAB-2345'],
    ])('debe normalizar «%s» como %s', (entrada, esperado) => {
      expect(normalizarCodigo(entrada)).toBe(esperado);
    });

    it.each([['hola'], ['EC-ABC'], ['EC-ABCD-23456'], ['']])(
      'debe rechazar «%s»',
      (entrada) => {
        expect(normalizarCodigo(entrada)).toBeNull();
      },
    );
  });

  describe('estadoInvitacion', () => {
    it.each([
      ['Esperada', crearInvitacion(), undefined],
      ['Adentro', crearInvitacion(), crearAcceso()],
      ['Salió', crearInvitacion(), crearAcceso({ fechaSalida: AHORA })],
      ['Cancelada', crearInvitacion({ canceladaEn: AHORA }), undefined],
      [
        'Vencida',
        crearInvitacion({ validaHasta: new Date('2026-11-06T14:30:00Z') }),
        undefined,
      ],
    ])('debe responder %s', (esperado, invitacion, acceso) => {
      expect(estadoInvitacion(invitacion, acceso, AHORA)).toBe(esperado);
    });

    it('debe priorizar el ingreso sobre la cancelación o el vencimiento', () => {
      const invitacion = crearInvitacion({
        canceladaEn: AHORA,
        validaHasta: new Date('2026-11-06T14:30:00Z'),
      });

      expect(estadoInvitacion(invitacion, crearAcceso(), AHORA)).toBe(
        'Adentro',
      );
    });
  });

  describe('resultadoValidacion', () => {
    it.each([
      ['no_existe', null, undefined, true],
      ['usado', crearInvitacion(), crearAcceso({ fechaSalida: AHORA }), true],
      ['adentro', crearInvitacion(), crearAcceso(), true],
      ['cancelada', crearInvitacion({ canceladaEn: AHORA }), undefined, true],
      ['sin_invitante', crearInvitacion(), undefined, false],
      [
        'temprano',
        crearInvitacion({ validaDesde: new Date('2026-11-06T15:16:00Z') }),
        undefined,
        true,
      ],
      [
        'valido',
        crearInvitacion({ validaDesde: new Date('2026-11-06T15:15:00Z') }),
        undefined,
        true,
      ],
      [
        'vencido',
        crearInvitacion({ validaHasta: new Date('2026-11-06T14:59:59Z') }),
        undefined,
        true,
      ],
      ['vencido', crearInvitacion({ validaHasta: AHORA }), undefined, true],
      [
        'valido',
        crearInvitacion({ validaHasta: new Date(AHORA.getTime() + 1) }),
        undefined,
        true,
      ],
      [
        'temprano',
        crearInvitacion({
          validaDesde: new Date(AHORA.getTime() + 15 * 60 * 1000 + 1),
        }),
        undefined,
        true,
      ],
    ] as const)(
      'debe responder %s',
      (esperado, invitacion, acceso, invitanteVigente) => {
        expect(
          resultadoValidacion(invitacion, acceso, invitanteVigente, AHORA),
        ).toBe(esperado);
      },
    );

    it.each([
      [
        'cancelada antes que vencida',
        'cancelada',
        crearInvitacion({ canceladaEn: AHORA, validaHasta: AHORA }),
        undefined,
        true,
      ],
      [
        'cancelada antes que sin invitante',
        'cancelada',
        crearInvitacion({ canceladaEn: AHORA }),
        undefined,
        false,
      ],
      [
        'sin invitante antes que vencida',
        'sin_invitante',
        crearInvitacion({ validaHasta: AHORA }),
        undefined,
        false,
      ],
      [
        'el ingreso antes que la cancelación',
        'adentro',
        crearInvitacion({ canceladaEn: AHORA }),
        crearAcceso(),
        true,
      ],
    ] as const)(
      'debe priorizar %s',
      (_caso, esperado, invitacion, acceso, invitanteVigente) => {
        expect(
          resultadoValidacion(invitacion, acceso, invitanteVigente, AHORA),
        ).toBe(esperado);
      },
    );

    it('debe dar Vencida en el mismo instante en que la garita la da por vencida', () => {
      const invitacion = crearInvitacion({ validaHasta: AHORA });

      expect(estadoInvitacion(invitacion, undefined, AHORA)).toBe('Vencida');
      expect(resultadoValidacion(invitacion, undefined, true, AHORA)).toBe(
        'vencido',
      );
    });
  });

  describe('decisionAcceso', () => {
    it('debe aprobar con hora de ingreso y la vía indicada', () => {
      expect(decisionAcceso(true, ViaAutorizacion.APP, AHORA)).toEqual({
        estadoAutorizacion: EstadoAutorizacion.APROBADO,
        autorizadoVia: ViaAutorizacion.APP,
        fechaIngreso: AHORA,
      });
    });

    it('debe rechazar sin hora de ingreso pero con la vía, como exigen los CHECK', () => {
      expect(decisionAcceso(false, ViaAutorizacion.TELEFONO, AHORA)).toEqual({
        estadoAutorizacion: EstadoAutorizacion.RECHAZADO,
        autorizadoVia: ViaAutorizacion.TELEFONO,
        fechaIngreso: null,
      });
    });
  });

  describe('limitePendiente', () => {
    it('debe ubicar el vencimiento de las llegadas pendientes 30 minutos atrás', () => {
      expect(limitePendiente(AHORA)).toEqual(new Date('2026-11-06T14:30:00Z'));
    });
  });

  describe('separarNombre', () => {
    it.each([
      ['Daniela Pino Soto', { nombre: 'Daniela', apellido: 'Pino Soto' }],
      ['Rappi', { nombre: 'Rappi', apellido: '' }],
    ])('debe separar «%s»', (entrada, esperado) => {
      expect(separarNombre(entrada)).toEqual(esperado);
    });

    it('debe recortar a 50 caracteres por columna', () => {
      const resultado = separarNombre(`${'a'.repeat(60)} ${'b'.repeat(60)}`);

      expect(resultado.nombre).toHaveLength(50);
      expect(resultado.apellido).toHaveLength(50);
    });
  });
});

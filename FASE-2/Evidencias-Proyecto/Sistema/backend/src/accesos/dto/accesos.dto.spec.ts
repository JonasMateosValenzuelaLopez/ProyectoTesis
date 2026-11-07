import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  BusquedaPorteriaDto,
  CodigoInvitacionDto,
  CrearInvitacionDto,
  CrearRetencionDto,
  DecisionAccesoDto,
  IngresoSinInvitacionDto,
} from './accesos.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const INVITACION = {
  nombre: 'Daniela Pino',
  categoria: 'Visita',
  validaDesde: '2026-11-06T18:00:00Z',
  validaHasta: '2026-11-06T22:00:00-03:00',
};

describe('DTO de accesos', () => {
  describe('CrearInvitacionDto', () => {
    it('debe normalizar nombre, RUT y patente', async () => {
      const { dto, mensajes } = await validar(CrearInvitacionDto, {
        ...INVITACION,
        nombre: '  Daniela    Pino ',
        rut: '12.345.678-5',
        patente: 'rt-kd 45',
      });

      expect(mensajes).toEqual([]);
      expect(dto.nombre).toBe('Daniela Pino');
      expect(dto.rut).toBe('12345678-5');
      expect(dto.patente).toBe('RTKD45');
    });

    it('debe dejar como undefined el RUT y la patente vacíos', async () => {
      const { dto, mensajes } = await validar(CrearInvitacionDto, {
        ...INVITACION,
        rut: '  ',
        patente: ' ',
      });

      expect(mensajes).toEqual([]);
      expect(dto.rut).toBeUndefined();
      expect(dto.patente).toBeUndefined();
    });

    it.each([
      [{ nombre: '  ' }, 'Escribe el nombre de la visita'],
      [{ nombre: 'A' }, 'El nombre debe tener al menos 2 caracteres'],
      [
        { nombre: 'a'.repeat(101) },
        'El nombre no puede superar 100 caracteres',
      ],
      [{ rut: '12.345.678-9' }, 'El RUT no es válido'],
      [
        { categoria: 'Familiar' },
        'La categoría debe ser Visita, Proveedor, Servicio o Delivery',
      ],
      [
        { patente: 'AB1' },
        'La patente debe tener entre 4 y 8 letras o números, sin espacios',
      ],
      [
        { patente: 'ABCDEFGHI' },
        'La patente debe tener entre 4 y 8 letras o números, sin espacios',
      ],
      [{ idUnidad: 0 }, 'La unidad no es válida'],
    ])('con %j debe responder «%s»', async (cambios, mensaje) => {
      const { mensajes } = await validar(CrearInvitacionDto, {
        ...INVITACION,
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    });

    it.each([
      ['2026-11-06T18:00:00'],
      ['2026-11-06 18:00:00Z'],
      ['2026-02-30T18:00:00Z'],
      ['mañana'],
    ])('debe rechazar la fecha y hora «%s»', async (validaDesde) => {
      const { mensajes } = await validar(CrearInvitacionDto, {
        ...INVITACION,
        validaDesde,
      });

      expect(mensajes).toEqual([
        'La fecha y hora debe venir en formato ISO 8601 con zona, por ejemplo 2026-11-06T18:00:00Z',
      ]);
    });

    it('debe exigir las dos fechas', async () => {
      const { mensajes } = await validar(CrearInvitacionDto, {
        nombre: 'Daniela',
        categoria: 'Visita',
      });

      expect(mensajes).toEqual(
        expect.arrayContaining([
          'Indica desde cuándo vale la invitación',
          'Indica hasta cuándo vale la invitación',
        ]),
      );
    });
  });

  describe('IngresoSinInvitacionDto', () => {
    it('debe exigir la vivienda', async () => {
      const { mensajes } = await validar(IngresoSinInvitacionDto, {
        nombre: 'Rappi',
        categoria: 'Delivery',
      });

      expect(mensajes).toContain('Indica la vivienda que visita');
    });

    it('debe aceptar una llegada sin RUT ni patente', async () => {
      const { mensajes } = await validar(IngresoSinInvitacionDto, {
        nombre: 'Rappi',
        categoria: 'Delivery',
        idUnidad: 3,
      });

      expect(mensajes).toEqual([]);
    });
  });

  describe('CodigoInvitacionDto', () => {
    it.each([
      [{}, 'Escribe o escanea el código'],
      [{ codigo: '   ' }, 'Escribe o escanea el código'],
      [{ codigo: 'X'.repeat(21) }, 'El código no es válido'],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(CodigoInvitacionDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('DecisionAccesoDto', () => {
    it('debe exigir un booleano', async () => {
      const { mensajes } = await validar(DecisionAccesoDto, {
        aprobado: 'si',
      });

      expect(mensajes).toEqual(['aprobado debe ser true o false']);
    });
  });

  describe('BusquedaPorteriaDto', () => {
    it.each([
      [{ q: 'a' }, 'Escribe al menos 2 caracteres'],
      [{ q: ' a ' }, 'Escribe al menos 2 caracteres'],
      [{ q: 'a'.repeat(51) }, 'La búsqueda no puede superar 50 caracteres'],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(BusquedaPorteriaDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('CrearRetencionDto', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-11-06T15:00:00Z') });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe aceptar un rango de días pasados con un motivo y normalizar sus espacios', async () => {
      const { dto, mensajes } = await validar(CrearRetencionDto, {
        desde: '2026-10-01',
        hasta: '2026-11-06',
        motivo: '  Robo   en estacionamientos ',
      });

      expect(mensajes).toEqual([]);
      expect(dto.motivo).toBe('Robo en estacionamientos');
    });

    it.each([
      [{ hasta: '2026-11-07' }, 'La fecha no puede ser futura'],
      [
        { desde: '2026-02-30' },
        'La fecha debe tener el formato AAAA-MM-DD y existir',
      ],
      [{ motivo: 'Robo' }, 'Explica el incidente en al menos 10 caracteres'],
      [
        { motivo: 'a'.repeat(301) },
        'El motivo no puede superar 300 caracteres',
      ],
    ])('con %j debe responder «%s»', async (cambios, mensaje) => {
      const { mensajes } = await validar(CrearRetencionDto, {
        desde: '2026-10-01',
        hasta: '2026-10-15',
        motivo: 'Robo en estacionamientos',
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    });
  });
});

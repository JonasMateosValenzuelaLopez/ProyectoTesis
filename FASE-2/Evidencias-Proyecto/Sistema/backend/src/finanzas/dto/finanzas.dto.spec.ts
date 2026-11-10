import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  AvisarTransferenciaDto,
  CrearCobroDto,
  EditarCategoriaDto,
  MarcarPagosDto,
  RechazarAvisosDto,
} from './finanzas.dto';

const AHORA = new Date('2026-11-05T15:00:00Z');

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const cobro = {
  idCategoria: 3,
  concepto: '  Gasto común noviembre ',
  montoPorUnidad: 45000,
  fechaVencimiento: '2026-11-10',
};

describe('DTO de finanzas', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CrearCobroDto', () => {
    it('debe aceptar un cobro y recortar el concepto', async () => {
      const { dto, mensajes } = await validar(CrearCobroDto, cobro);

      expect(mensajes).toEqual([]);
      expect(dto.concepto).toBe('Gasto común noviembre');
    });

    it('debe aceptar que venza hoy', async () => {
      const { mensajes } = await validar(CrearCobroDto, {
        ...cobro,
        fechaVencimiento: '2026-11-05',
      });

      expect(mensajes).toEqual([]);
    });

    it.each([
      [{ idCategoria: undefined }, 'Elige una categoría'],
      [{ concepto: '  ' }, 'El concepto es obligatorio'],
      [
        { montoPorUnidad: 0 },
        'El monto debe ser un número entero entre 1 y 99999999',
      ],
      [
        { montoPorUnidad: 1500.5 },
        'El monto debe ser un número entero entre 1 y 99999999',
      ],
      [
        { montoPorUnidad: 100000000 },
        'El monto debe ser un número entero entre 1 y 99999999',
      ],
      [
        { fechaVencimiento: '2026-11-04' },
        'La fecha no puede ser anterior a hoy',
      ],
      [
        { fechaVencimiento: '10-11-2026' },
        'La fecha debe tener el formato AAAA-MM-DD y existir',
      ],
      [{ extraordinario: 'si' }, 'extraordinario debe ser true o false'],
    ])('con %j debe responder «%s»', async (cambios, mensaje) => {
      const { mensajes } = await validar(CrearCobroDto, {
        ...cobro,
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    });
  });

  it('EditarCategoriaDto debe aceptar solo activar o desactivar', async () => {
    const { mensajes } = await validar(EditarCategoriaDto, { activa: false });

    expect(mensajes).toEqual([]);
  });

  describe('MarcarPagosDto y RechazarAvisosDto', () => {
    it.each([
      [{ idsCobroUnidad: [] }, 'Indica los cobros a marcar'],
      [{ idsCobroUnidad: [1, 1] }, 'No repitas cobros'],
      [{ idsCobroUnidad: [1, -2] }, 'Los cobros indicados no son válidos'],
      [
        { idsCobroUnidad: [1], metodo: 'Cheque' },
        'El método debe ser Transferencia o Efectivo',
      ],
    ])('MarcarPagosDto con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(MarcarPagosDto, datos);

      expect(mensajes).toContain(mensaje);
    });

    it('RechazarAvisosDto debe aceptar un motivo opcional', async () => {
      const { dto, mensajes } = await validar(RechazarAvisosDto, {
        idsAviso: [4],
        motivo: '  No aparece en la cartola ',
      });

      expect(mensajes).toEqual([]);
      expect(dto.motivo).toBe('No aparece en la cartola');
    });
  });

  describe('AvisarTransferenciaDto', () => {
    const aviso = { idUnidad: 12, monto: 50000, fechaPago: '2026-11-04' };

    it('debe aceptar un aviso de hoy o de días anteriores', async () => {
      const { mensajes } = await validar(AvisarTransferenciaDto, aviso);

      expect(mensajes).toEqual([]);
    });

    it.each([
      [{ fechaPago: '2026-11-06' }, 'La fecha no puede ser futura'],
      [{ monto: -5 }, 'El monto debe ser un número entero entre 1 y 99999999'],
      [{ idUnidad: undefined }, 'Indica tu unidad'],
      [
        { observacion: 'a'.repeat(256) },
        'La nota no puede superar 255 caracteres',
      ],
    ])('con %j debe responder «%s»', async (cambios, mensaje) => {
      const { mensajes } = await validar(AvisarTransferenciaDto, {
        ...aviso,
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    });
  });
});

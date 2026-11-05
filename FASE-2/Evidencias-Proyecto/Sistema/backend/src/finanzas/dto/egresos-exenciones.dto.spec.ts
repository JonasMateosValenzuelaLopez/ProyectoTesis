import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  DecidirDto,
  RegistrarEgresoDto,
  ReporteDto,
  SolicitarExencionDto,
} from './egresos-exenciones.dto';

const AHORA = new Date('2026-11-05T15:00:00Z');

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const egreso = {
  idCategoria: 2,
  monto: 150000,
  descripcion: ' Reparación portón ',
  fechaEgreso: '2026-11-05',
};

describe('DTO de egresos, exenciones y reportes', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe aceptar un egreso con comprobante https y recortar la descripción', async () => {
    const { dto, mensajes } = await validar(RegistrarEgresoDto, {
      ...egreso,
      comprobanteUrl: 'https://drive.google.com/archivo',
    });

    expect(mensajes).toEqual([]);
    expect(dto.descripcion).toBe('Reparación portón');
  });

  it.each([
    [{ fechaEgreso: '2026-11-06' }, 'La fecha no puede ser futura'],
    [
      { comprobanteUrl: 'http://sitio.cl/a' },
      'El comprobante debe ser un enlace https',
    ],
    [
      { comprobanteUrl: 'javascript:alert(1)' },
      'El comprobante debe ser un enlace https',
    ],
    [{ descripcion: '' }, 'La descripción es obligatoria'],
    [{ monto: 0 }, 'El monto debe ser un número entero entre 1 y 99999999'],
  ])(
    'RegistrarEgresoDto con %j debe responder «%s»',
    async (cambios, mensaje) => {
      const { mensajes } = await validar(RegistrarEgresoDto, {
        ...egreso,
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    },
  );

  it('DecidirDto debe exigir aprobado como booleano', async () => {
    const { mensajes } = await validar(DecidirDto, { aprobado: 'si' });

    expect(mensajes).toContain('aprobado debe ser true o false');
  });

  it('SolicitarExencionDto debe exigir el motivo', async () => {
    const { mensajes } = await validar(SolicitarExencionDto, {
      idCobroUnidad: 1,
      motivo: '   ',
    });

    expect(mensajes).toContain('El motivo es obligatorio');
  });

  it.each([['2026-11'], [undefined]])(
    'ReporteDto debe aceptar el periodo %s',
    async (periodo) => {
      const { mensajes } = await validar(ReporteDto, { periodo });

      expect(mensajes).toEqual([]);
    },
  );

  it.each([['2026-13'], ['2026-1'], ['noviembre']])(
    'ReporteDto debe rechazar el periodo %s',
    async (periodo) => {
      const { mensajes } = await validar(ReporteDto, { periodo });

      expect(mensajes).toContain('El periodo debe tener el formato AAAA-MM');
    },
  );
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  EditarAvisoDto,
  PaginaAvisosDto,
  PedirContactoDto,
  PublicarAvisoDto,
  ResponderSolicitudDto,
} from './marketplace.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const MENSAJE_PRECIO =
  'El precio debe ser un número entero entre 0 y 99.999.999';

describe('DTO del marketplace', () => {
  describe('PublicarAvisoDto', () => {
    it('debe aceptar un aviso de venta y normalizar sus textos', async () => {
      const { dto, mensajes } = await validar(PublicarAvisoDto, {
        tipo: 'Vendo',
        titulo: '  Bicicleta aro 26  ',
        descripcion: '  En buen estado\r\nse puede probar  ',
        precio: 45000,
      });

      expect(mensajes).toEqual([]);
      expect(dto.titulo).toBe('Bicicleta aro 26');
      expect(dto.descripcion).toBe('En buen estado\nse puede probar');
    });

    it.each([
      [{ tipo: 'Busco', titulo: 'Escalera' }],
      [{ tipo: 'Busco', titulo: 'Escalera', precio: null }],
      [{ tipo: 'Servicio', titulo: 'Clases de matemáticas' }],
      [{ tipo: 'Vendo', titulo: 'Sillas', precio: 0 }],
      [{ tipo: 'Vendo', titulo: 'Auto', precio: 99_999_999 }],
      [{ tipo: 'Vendo', titulo: 'Mesa', descripcion: '   ' }],
    ])('debe aceptar %j', async (datos) => {
      const { mensajes } = await validar(PublicarAvisoDto, datos);

      expect(mensajes).toEqual([]);
    });

    it('debe dejar la descripción vacía como undefined', async () => {
      const { dto } = await validar(PublicarAvisoDto, {
        tipo: 'Vendo',
        titulo: 'Mesa',
        descripcion: '   ',
      });

      expect(dto.descripcion).toBeUndefined();
    });

    it.each([
      [
        { tipo: 'Venta', titulo: 'Mesa' },
        'El tipo de aviso debe ser Vendo, Servicio o Busco',
      ],
      [{ tipo: 'Vendo', titulo: '  ' }, 'El título es obligatorio'],
      [
        { tipo: 'Vendo', titulo: 'ab' },
        'El título debe tener al menos 3 caracteres',
      ],
      [
        { tipo: 'Vendo', titulo: 'a'.repeat(101) },
        'El título no puede superar 100 caracteres',
      ],
      [
        { tipo: 'Vendo', titulo: 'Mesa', descripcion: 'a'.repeat(501) },
        'La descripción no puede superar 500 caracteres',
      ],
      [{ tipo: 'Vendo', titulo: 'Mesa', precio: -1 }, MENSAJE_PRECIO],
      [{ tipo: 'Vendo', titulo: 'Mesa', precio: 100_000_000 }, MENSAJE_PRECIO],
      [{ tipo: 'Vendo', titulo: 'Mesa', precio: 1500.5 }, MENSAJE_PRECIO],
      [{ tipo: 'Vendo', titulo: 'Mesa', precio: '1500' }, MENSAJE_PRECIO],
      [
        { tipo: 'Busco', titulo: 'Escalera', precio: 5000 },
        'Un aviso de «Busco» no lleva precio',
      ],
      [
        { tipo: 'Vendo', titulo: 'Mesa', idUnidad: 0 },
        'La unidad no es válida',
      ],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(PublicarAvisoDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('EditarAvisoDto', () => {
    it('debe aceptar título, descripción y precio', async () => {
      const { dto, mensajes } = await validar(EditarAvisoDto, {
        titulo: '  Bicicleta aro 29 ',
        descripcion: 'Casi nueva',
        precio: 40000,
      });

      expect(mensajes).toEqual([]);
      expect(dto.titulo).toBe('Bicicleta aro 29');
    });

    it('no debe permitir cambiar el tipo con las opciones del pipe global', async () => {
      const dto = plainToInstance(EditarAvisoDto, {
        titulo: 'Bicicleta',
        tipo: 'Busco',
      });

      const errores = await validate(dto, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      expect(errores.map((e) => e.property)).toEqual(['tipo']);
    });

    it.each([
      [{ titulo: 'ab' }, 'El título debe tener al menos 3 caracteres'],
      [{ titulo: 'Mesa', precio: -5 }, MENSAJE_PRECIO],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(EditarAvisoDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('PaginaAvisosDto', () => {
    it('debe convertir el cursor y aceptar el filtro por tipo', async () => {
      const { dto, mensajes } = await validar(PaginaAvisosDto, {
        tipo: 'Servicio',
        antesDe: '40',
        limite: '10',
      });

      expect(mensajes).toEqual([]);
      expect(dto).toEqual({ tipo: 'Servicio', antesDe: 40, limite: 10 });
    });

    it('debe rechazar un tipo que no existe', async () => {
      const { mensajes } = await validar(PaginaAvisosDto, { tipo: 'Permuta' });

      expect(mensajes).toEqual([
        'El tipo de aviso debe ser Vendo, Servicio o Busco',
      ]);
    });
  });

  describe('PedirContactoDto', () => {
    it('debe aceptar el cuerpo vacío', async () => {
      const { mensajes } = await validar(PedirContactoDto, {});

      expect(mensajes).toEqual([]);
    });

    it('debe rechazar una unidad no válida', async () => {
      const { mensajes } = await validar(PedirContactoDto, { idUnidad: -3 });

      expect(mensajes).toEqual(['La unidad no es válida']);
    });
  });

  describe('ResponderSolicitudDto', () => {
    it.each([[true], [false]])('debe aceptar aceptada = %s', async (valor) => {
      const { mensajes } = await validar(ResponderSolicitudDto, {
        aceptada: valor,
      });

      expect(mensajes).toEqual([]);
    });

    it.each([[{}], [{ aceptada: 'si' }]])(
      'con %j debe exigir un booleano',
      async (datos) => {
        const { mensajes } = await validar(ResponderSolicitudDto, datos);

        expect(mensajes).toEqual(['aceptada debe ser true o false']);
      },
    );
  });
});

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  ActualizarTelefonoDto,
  CambiarPasswordDto,
  ConfirmarCambioCorreoDto,
  SolicitarCambioCorreoDto,
} from './mis-datos.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const MENSAJE_TELEFONO = 'El teléfono debe tener el formato +56912345678';

describe('DTO de Mis datos', () => {
  describe('ActualizarTelefonoDto', () => {
    it.each([
      ['+56 9 6123 4501', '+56961234501'],
      ['+56 (9) 6123-4501', '+56961234501'],
      ['', null],
      ['   ', null],
    ])('debe normalizar «%s» como %p', async (telefono, esperado) => {
      const { dto, mensajes } = await validar(ActualizarTelefonoDto, {
        telefono,
      });

      expect(mensajes).toEqual([]);
      expect(dto.telefono).toBe(esperado);
    });

    it('debe aceptar null para quitar el teléfono', async () => {
      const { dto, mensajes } = await validar(ActualizarTelefonoDto, {
        telefono: null,
      });

      expect(mensajes).toEqual([]);
      expect(dto.telefono).toBeNull();
    });

    it('debe exigir el campo', async () => {
      const { mensajes } = await validar(ActualizarTelefonoDto, {});

      expect(mensajes).toContain('Indica el teléfono, o null para quitarlo');
    });

    it.each([['961234501'], ['+56'], ['+5691234567890123'], [56912345678]])(
      'debe rechazar %p',
      async (telefono) => {
        const { mensajes } = await validar(ActualizarTelefonoDto, {
          telefono,
        });

        expect(mensajes).toContain(MENSAJE_TELEFONO);
      },
    );
  });

  describe('SolicitarCambioCorreoDto', () => {
    it('debe recortar y pasar a minúsculas', async () => {
      const { dto, mensajes } = await validar(SolicitarCambioCorreoDto, {
        correo: '  Ana.Rojas@Correo.CL ',
        passwordActual: 'clave-actual',
      });

      expect(mensajes).toEqual([]);
      expect(dto.correo).toBe('ana.rojas@correo.cl');
    });

    it('debe aceptar un correo de exactamente 100 caracteres', async () => {
      const correo = `a@${'b'.repeat(60)}.${'c'.repeat(34)}.cl`;

      const { mensajes } = await validar(SolicitarCambioCorreoDto, {
        correo,
        passwordActual: 'clave-actual',
      });

      expect(correo).toHaveLength(100);
      expect(mensajes).toEqual([]);
    });

    it.each([
      [{}, 'Escribe tu nuevo correo'],
      [{ correo: 123 }, 'Escribe tu nuevo correo'],
      [{ correo: 'no-es-correo' }, 'El correo no es válido'],
      [
        { correo: `a@${'b'.repeat(60)}.${'c'.repeat(35)}.cl` },
        'El correo no puede superar 100 caracteres',
      ],
      [{ correo: 'ana@correo.cl' }, 'Escribe tu contraseña actual'],
      [
        { correo: 'ana@correo.cl', passwordActual: '' },
        'Escribe tu contraseña actual',
      ],
      [
        { correo: 'ana@correo.cl', passwordActual: 'a'.repeat(73) },
        'La contraseña actual no es correcta',
      ],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(SolicitarCambioCorreoDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('ConfirmarCambioCorreoDto', () => {
    it('debe quitar los espacios del código', async () => {
      const { dto, mensajes } = await validar(ConfirmarCambioCorreoDto, {
        codigo: ' 123 456 ',
      });

      expect(mensajes).toEqual([]);
      expect(dto.codigo).toBe('123456');
    });

    it.each([
      [{}],
      [{ codigo: '12345' }],
      [{ codigo: '1234567' }],
      [{ codigo: 'abcdef' }],
      [{ codigo: 123456 }],
    ])('con %j debe pedir 6 dígitos', async (datos) => {
      const { mensajes } = await validar(ConfirmarCambioCorreoDto, datos);

      expect(mensajes).toContain('El código debe tener 6 dígitos');
    });
  });

  describe('CambiarPasswordDto', () => {
    it('debe aceptar una contraseña nueva válida', async () => {
      const { mensajes } = await validar(CambiarPasswordDto, {
        passwordActual: 'Clave1234',
        passwordNueva: 'Nueva5678',
      });

      expect(mensajes).toEqual([]);
    });

    it('debe exigir la contraseña actual', async () => {
      const { mensajes } = await validar(CambiarPasswordDto, {
        passwordActual: '',
        passwordNueva: 'Nueva5678',
      });

      expect(mensajes).toContain('Escribe tu contraseña actual');
    });

    it('debe rechazar una contraseña actual de más de 72 bytes sin decir cuál es el límite', async () => {
      const { mensajes } = await validar(CambiarPasswordDto, {
        passwordActual: 'ñ'.repeat(37),
        passwordNueva: 'Nueva5678',
      });

      expect(mensajes).toEqual(['La contraseña actual no es correcta']);
    });

    it.each([
      ['corta', 'Ab1', 'La contraseña debe tener al menos 8 caracteres'],
      [
        'sin número',
        'solamenteletras',
        'La contraseña debe incluir al menos un número',
      ],
      [
        'sin letra',
        '1234567890',
        'La contraseña debe incluir al menos una letra',
      ],
      [
        'de más de 72 bytes',
        `a1${'ñ'.repeat(36)}`,
        'La contraseña no puede superar 72 caracteres (las tildes y la ñ cuentan doble)',
      ],
      ['ausente', undefined, 'La contraseña es obligatoria'],
    ])(
      'debe aplicar las mismas reglas del restablecimiento a una nueva %s',
      async (_caso, passwordNueva, mensaje) => {
        const { mensajes } = await validar(CambiarPasswordDto, {
          passwordActual: 'Clave1234',
          passwordNueva,
        });

        expect(mensajes).toContain(mensaje);
      },
    );
  });
});

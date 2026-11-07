import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import {
  CambiarUmbralVisadoDto,
  GuardarDatosComunidadDto,
} from './datos-comunidad.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const BASE = { nombre: 'Las Palmas', direccion: 'Av. Los Pinos 123' };

const MENSAJE_NUMERO_CUENTA =
  'El número de cuenta debe tener al menos 4 dígitos y solo puede llevar dígitos y guiones';

describe('DTO de datos de la comunidad', () => {
  describe('GuardarDatosComunidadDto', () => {
    it('debe normalizar los textos, el número de cuenta, el RUT y el correo', async () => {
      const { dto, mensajes } = await validar(GuardarDatosComunidadDto, {
        nombre: '  Condominio   Las Palmas ',
        direccion: ' Av. Los Pinos 123 ',
        banco: ' Banco  Estado ',
        tipoCuenta: 'Cuenta corriente',
        numeroCuenta: ' 00-158 74123-09 ',
        titularCuenta: ' Comunidad  Las Palmas ',
        identificadorTitular: '65.142.380-5',
        correoTransferencias: ' Pagos@LasPalmas.CL ',
      });

      expect(mensajes).toEqual([]);
      expect({ ...dto }).toEqual({
        nombre: 'Condominio Las Palmas',
        direccion: 'Av. Los Pinos 123',
        banco: 'Banco Estado',
        tipoCuenta: 'Cuenta corriente',
        numeroCuenta: '00-15874123-09',
        titularCuenta: 'Comunidad Las Palmas',
        identificadorTitular: '65142380-5',
        correoTransferencias: 'pagos@laspalmas.cl',
      });
    });

    it('debe tratar los datos de cuenta vacíos o null como no enviados', async () => {
      const { dto, mensajes } = await validar(GuardarDatosComunidadDto, {
        ...BASE,
        banco: '  ',
        tipoCuenta: '',
        numeroCuenta: null,
        titularCuenta: '',
        identificadorTitular: ' ',
        correoTransferencias: '',
      });

      expect(mensajes).toEqual([]);
      expect(dto.banco).toBeUndefined();
      expect(dto.numeroCuenta).toBeNull();
      expect(dto.identificadorTitular).toBeUndefined();
      expect(dto.correoTransferencias).toBeUndefined();
    });

    it.each([
      [{ direccion: 'Calle 1' }, 'El nombre es obligatorio'],
      [{ nombre: '   ', direccion: 'Calle 1' }, 'El nombre es obligatorio'],
      [{ nombre: 'Las Palmas' }, 'La dirección es obligatoria'],
      [
        { ...BASE, nombre: 'a'.repeat(101) },
        'El nombre no puede superar 100 caracteres',
      ],
      [
        { ...BASE, direccion: 'a'.repeat(151) },
        'La dirección no puede superar 150 caracteres',
      ],
      [
        { ...BASE, banco: 'b'.repeat(61) },
        'El banco no puede superar 60 caracteres',
      ],
      [
        { ...BASE, tipoCuenta: 'Cuenta bipersonal' },
        'El tipo de cuenta debe ser Cuenta corriente, Cuenta vista, Cuenta RUT o Cuenta de ahorro',
      ],
      [{ ...BASE, numeroCuenta: '123' }, MENSAJE_NUMERO_CUENTA],
      [{ ...BASE, numeroCuenta: '1234--56' }, MENSAJE_NUMERO_CUENTA],
      [{ ...BASE, numeroCuenta: '-123456' }, MENSAJE_NUMERO_CUENTA],
      [{ ...BASE, numeroCuenta: 'CTA123456' }, MENSAJE_NUMERO_CUENTA],
      [{ ...BASE, numeroCuenta: 62900145872 }, MENSAJE_NUMERO_CUENTA],
      [
        { ...BASE, numeroCuenta: '1'.repeat(31) },
        'El número de cuenta no puede superar 30 caracteres',
      ],
      [
        { ...BASE, titularCuenta: 't'.repeat(101) },
        'El titular no puede superar 100 caracteres',
      ],
      [
        { ...BASE, identificadorTitular: '65.142.380-7' },
        'El RUT del titular no es válido',
      ],
      [
        { ...BASE, correoTransferencias: 'no-es-correo' },
        'El correo para comprobantes no es válido',
      ],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(GuardarDatosComunidadDto, datos);

      expect(mensajes).toContain(mensaje);
    });

    it.each([
      ['Cuenta corriente'],
      ['Cuenta vista'],
      ['Cuenta RUT'],
      ['Cuenta de ahorro'],
    ])('debe aceptar el tipo «%s»', async (tipoCuenta) => {
      const { mensajes } = await validar(GuardarDatosComunidadDto, {
        ...BASE,
        tipoCuenta,
      });

      expect(mensajes).toEqual([]);
    });
  });

  describe('CambiarUmbralVisadoDto', () => {
    it.each([[1], [300000], [9_999_999_999]])(
      'debe aceptar %p',
      async (umbralVisado) => {
        const { mensajes } = await validar(CambiarUmbralVisadoDto, {
          umbralVisado,
        });

        expect(mensajes).toEqual([]);
      },
    );

    it.each([[0], [-5], [1500.5], [10_000_000_000], ['300000'], [null]])(
      'debe rechazar %p',
      async (umbralVisado) => {
        const { mensajes } = await validar(CambiarUmbralVisadoDto, {
          umbralVisado,
        });

        expect(mensajes).toContain(
          'El monto debe ser un número entero entre 1 y 9999999999',
        );
      },
    );
  });
});

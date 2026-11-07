import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MisDatosController } from './mis-datos.controller';
import { MisDatosService } from './mis-datos.service';

const metodo = (nombre: keyof MisDatosController) =>
  MisDatosController.prototype[nombre];

describe('MisDatosController', () => {
  it('debe exigir sesión sin pedir comunidad', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MisDatosController)).toEqual([
      JwtAuthGuard,
    ]);
  });

  it.each([
    ['actualizarTelefono', 10],
    ['solicitarCambioCorreo', 5],
    ['confirmarCambioCorreo', 5],
    ['cambiarPassword', 5],
  ] as const)('debe limitar %s a %i por minuto', (nombre, limite) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      limite,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
      60_000,
    );
  });

  it.each([
    ['solicitarCambioCorreo', HttpStatus.ACCEPTED],
    ['confirmarCambioCorreo', HttpStatus.OK],
  ] as const)('debe responder %s con %i', (nombre, codigo) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
      codigo,
    );
  });

  describe('delegación al servicio', () => {
    const USUARIO = { idUsuario: 2, esPlataforma: false };
    let target: MisDatosController;
    let mockServicio: Record<
      'actualizarTelefono' | 'solicitarCambioCorreo' | 'confirmarCambioCorreo',
      jest.Mock
    >;

    beforeEach(() => {
      mockServicio = {
        actualizarTelefono: jest.fn().mockResolvedValue('perfil'),
        solicitarCambioCorreo: jest.fn().mockResolvedValue('pedido'),
        confirmarCambioCorreo: jest.fn().mockResolvedValue('perfil'),
      };
      target = new MisDatosController(
        mockServicio as unknown as MisDatosService,
      );
    });

    it.each([
      ['actualizarTelefono', { telefono: '+56961234501' }, 'perfil'],
      ['solicitarCambioCorreo', { correo: 'ana@correo.cl' }, 'pedido'],
      ['confirmarCambioCorreo', { codigo: '123456' }, 'perfil'],
    ] as const)(
      '%s debe usar el id de la sesión y devolver lo del servicio',
      async (nombre, dto, esperado) => {
        const resultado = await (
          target[nombre] as (u: typeof USUARIO, d: object) => Promise<unknown>
        ).call(target, USUARIO, dto);

        expect(mockServicio[nombre]).toHaveBeenCalledWith(2, dto);
        expect(resultado).toBe(esperado);
      },
    );
  });
});

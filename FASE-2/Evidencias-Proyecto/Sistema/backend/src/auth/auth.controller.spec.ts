import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const metodo = (nombre: keyof AuthController) =>
  AuthController.prototype[nombre];

describe('AuthController', () => {
  it.each([
    ['login', 5],
    ['solicitarCodigo', 3],
    ['verificarCodigo', 5],
    ['recuperarPassword', 3],
    ['restablecerPassword', 5],
  ] as const)(
    'debe limitar %s a %i peticiones por minuto y por IP',
    (nombre, limite) => {
      expect(
        Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre)),
      ).toBe(limite);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
        60_000,
      );
    },
  );

  it.each([['perfil'], ['marcarTutorialVisto']] as const)(
    'debe exigir sesión en %s',
    (nombre) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, metodo(nombre))).toEqual([
        JwtAuthGuard,
      ]);
    },
  );

  it('debe responder 204 sin contenido al marcar el tutorial', () => {
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, metodo('marcarTutorialVisto')),
    ).toBe(HttpStatus.NO_CONTENT);
  });

  it.each([
    ['login'],
    ['solicitarCodigo'],
    ['verificarCodigo'],
    ['recuperarPassword'],
    ['restablecerPassword'],
  ] as const)('debe dejar público %s', (nombre) => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, metodo(nombre)),
    ).toBeUndefined();
  });
});

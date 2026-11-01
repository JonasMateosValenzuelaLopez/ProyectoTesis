import { GUARDS_METADATA } from '@nestjs/common/constants';
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

  it('debe exigir sesión para ver el perfil', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, metodo('perfil'))).toEqual([
      JwtAuthGuard,
    ]);
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

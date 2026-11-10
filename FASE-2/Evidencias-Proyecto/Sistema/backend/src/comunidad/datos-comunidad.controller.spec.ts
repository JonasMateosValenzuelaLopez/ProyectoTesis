import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { DatosComunidadController } from './datos-comunidad.controller';

const metodo = (nombre: keyof DatosComunidadController) =>
  DatosComunidadController.prototype[nombre];

describe('DatosComunidadController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a la comunidad en todas las rutas', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, DatosComunidadController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('no debe depender de un módulo contratado', () => {
    expect(reflector.get(MODULO_KEY, DatosComunidadController)).toBeUndefined();
  });

  it('debe dejar ver los datos solo a la directiva, no a residentes ni conserjes', () => {
    expect(reflector.get(ROLES_KEY, metodo('obtener'))).toEqual([
      RolUsuario.ADMINISTRADOR,
      RolUsuario.PRESIDENTE,
      RolUsuario.TESORERO,
      RolUsuario.SECRETARIO,
    ]);
  });

  it('debe dejar editar los datos y la cuenta solo a la administración', () => {
    expect(reflector.get(ROLES_KEY, metodo('guardar'))).toEqual([
      RolUsuario.ADMINISTRADOR,
    ]);
  });

  it('debe dejar cambiar el umbral de visado solo a la Presidencia', () => {
    expect(reflector.get(ROLES_KEY, metodo('cambiarUmbralVisado'))).toEqual([
      RolUsuario.PRESIDENTE,
    ]);
  });

  it.each([['guardar'], ['cambiarUmbralVisado']] as const)(
    'debe limitar %s a 20 peticiones por minuto',
    (nombre) => {
      expect(
        Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre)),
      ).toBe(20);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
        60_000,
      );
    },
  );
});

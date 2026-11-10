import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { ModulosComunidadController } from './modulos-comunidad.controller';

const metodo = (nombre: keyof ModulosComunidadController) =>
  ModulosComunidadController.prototype[nombre];

describe('ModulosComunidadController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a la comunidad en todas las rutas', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ModulosComunidadController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('no debe depender de un módulo contratado', () => {
    expect(
      reflector.get(MODULO_KEY, ModulosComunidadController),
    ).toBeUndefined();
  });

  it.each([['listar'], ['cambiar']] as const)(
    'debe permitir %s solo a la administración',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
        RolUsuario.ADMINISTRADOR,
      ]);
    },
  );

  it('debe limitar cambiar a 20 peticiones por minuto', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('cambiar')),
    ).toBe(20);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo('cambiar'))).toBe(
      60_000,
    );
  });
});

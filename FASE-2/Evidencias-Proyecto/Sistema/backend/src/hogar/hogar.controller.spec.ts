import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { HogarController } from './hogar.controller';

const metodo = (nombre: keyof HogarController) =>
  HogarController.prototype[nombre];

describe('HogarController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a una comunidad activa en todas las rutas', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, HogarController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('no debe exigir cargo ni módulo, porque el acceso depende de vivir en la unidad', () => {
    expect(reflector.get(ROLES_KEY, HogarController)).toBeUndefined();
    expect(reflector.get(MODULO_KEY, HogarController)).toBeUndefined();
  });

  it.each([
    ['crear'],
    ['actualizar'],
    ['registrarMantencion'],
    ['eliminar'],
  ] as const)('debe limitar %s a 30 peticiones por minuto', (nombre) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      30,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
      60_000,
    );
  });

  it('no debe bajar el límite global al listar', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('listar')),
    ).toBeUndefined();
  });

  it.each([
    ['registrarMantencion', HttpStatus.OK],
    ['eliminar', HttpStatus.NO_CONTENT],
  ] as const)('debe responder %s con %i', (nombre, codigo) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
      codigo,
    );
  });
});

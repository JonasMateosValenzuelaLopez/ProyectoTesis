import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { GuiaController } from './guia.controller';

const metodo = (nombre: keyof GuiaController) =>
  GuiaController.prototype[nombre];

describe('GuiaController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a una comunidad activa en todas las rutas', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, GuiaController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('debe dejar leer la guía a cualquier cargo vigente', () => {
    expect(reflector.get(ROLES_KEY, metodo('obtener'))).toBeUndefined();
    expect(reflector.get(ROLES_KEY, GuiaController)).toBeUndefined();
  });

  it('no debe depender de un módulo contratado', () => {
    expect(reflector.get(MODULO_KEY, GuiaController)).toBeUndefined();
  });

  it('debe dejar editar la guía solo a la administración y la secretaría', () => {
    expect(reflector.get(ROLES_KEY, metodo('guardar'))).toEqual([
      RolUsuario.ADMINISTRADOR,
      RolUsuario.SECRETARIO,
    ]);
  });

  it('debe limitar el guardado a 30 peticiones por minuto', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('guardar')),
    ).toBe(30);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo('guardar'))).toBe(
      60_000,
    );
  });

  it('no debe bajar el límite global al leer', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('obtener')),
    ).toBeUndefined();
  });
});

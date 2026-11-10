import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ResidenciasController } from './residencias.controller';

const metodo = (nombre: keyof ResidenciasController) =>
  ResidenciasController.prototype[nombre];

describe('ResidenciasController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a una comunidad activa para marcar la guía', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, metodo('marcarGuiaVista')),
    ).toEqual([JwtAuthGuard, RolesGuard]);
  });

  it('debe permitir marcar la guía a cualquier cargo, porque la propiedad se valida en el servicio', () => {
    expect(reflector.get(ROLES_KEY, metodo('marcarGuiaVista'))).toBeUndefined();
    expect(reflector.get(ROLES_KEY, ResidenciasController)).toBeUndefined();
  });

  it('debe responder 204 sin contenido al marcar la guía', () => {
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, metodo('marcarGuiaVista')),
    ).toBe(HttpStatus.NO_CONTENT);
  });
});

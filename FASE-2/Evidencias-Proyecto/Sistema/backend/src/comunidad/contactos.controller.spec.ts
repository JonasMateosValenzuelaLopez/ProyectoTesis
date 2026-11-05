import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContactosController } from './contactos.controller';

const metodo = (nombre: keyof ContactosController) =>
  ContactosController.prototype[nombre];

describe('ContactosController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a una comunidad activa en todas las rutas', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ContactosController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('no debe depender de un módulo contratado', () => {
    expect(reflector.get(MODULO_KEY, ContactosController)).toBeUndefined();
  });

  it('debe dejar listar a cualquier cargo vigente', () => {
    expect(reflector.get(ROLES_KEY, metodo('listar'))).toBeUndefined();
    expect(reflector.get(ROLES_KEY, ContactosController)).toBeUndefined();
  });

  it.each([['crear'], ['actualizar'], ['eliminar']] as const)(
    'debe dejar %s solo a la administración, la secretaría y la presidencia',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
        RolUsuario.ADMINISTRADOR,
        RolUsuario.SECRETARIO,
        RolUsuario.PRESIDENTE,
      ]);
    },
  );

  it.each([['crear'], ['actualizar'], ['eliminar']] as const)(
    'debe limitar %s a 30 peticiones por minuto',
    (nombre) => {
      expect(
        Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre)),
      ).toBe(30);
      expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
        60_000,
      );
    },
  );

  it('no debe bajar el límite global al listar', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('listar')),
    ).toBeUndefined();
  });

  it('debe responder eliminar con 204', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo('eliminar'))).toBe(
      HttpStatus.NO_CONTENT,
    );
  });
});

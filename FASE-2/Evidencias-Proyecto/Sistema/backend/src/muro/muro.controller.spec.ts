import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { MuroController } from './muro.controller';

const metodo = (nombre: keyof MuroController) =>
  MuroController.prototype[nombre];

const DIRECTIVA = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.PRESIDENTE,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
];

describe('MuroController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión, comunidad activa y el módulo del muro', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MuroController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(reflector.get(MODULO_KEY, MuroController)).toBe(CodigoModulo.MURO);
  });

  it.each([['listar'], ['publicar'], ['eliminar'], ['reportar']] as const)(
    'debe dejar %s a cualquier persona de la comunidad',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toBeUndefined();
    },
  );

  it.each([
    ['listarOficiales', DIRECTIVA],
    ['publicarOficial', DIRECTIVA],
    ['eliminarOficial', DIRECTIVA],
    ['decidirOficial', [RolUsuario.PRESIDENTE]],
    ['listarModeracion', [RolUsuario.ADMINISTRADOR]],
    ['ocultar', [RolUsuario.ADMINISTRADOR]],
    ['restaurar', [RolUsuario.ADMINISTRADOR]],
    ['descartarReportes', [RolUsuario.ADMINISTRADOR]],
  ] as const)('debe dejar %s a %j', (nombre, roles) => {
    expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual(roles);
  });

  it.each([
    ['publicar', 10],
    ['reportar', 10],
    ['publicarOficial', 10],
    ['eliminarOficial', 30],
    ['ocultar', 30],
  ] as const)('debe limitar %s a %i por minuto', (nombre, limite) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      limite,
    );
  });

  it.each([
    ['eliminar', HttpStatus.NO_CONTENT],
    ['eliminarOficial', HttpStatus.NO_CONTENT],
    ['decidirOficial', HttpStatus.OK],
    ['ocultar', HttpStatus.OK],
    ['restaurar', HttpStatus.OK],
    ['descartarReportes', HttpStatus.OK],
  ] as const)('debe responder %s con %i', (nombre, codigo) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
      codigo,
    );
  });
});

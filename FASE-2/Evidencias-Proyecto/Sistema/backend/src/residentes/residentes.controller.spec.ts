import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { ResidentesController } from './residentes.controller';

const metodo = (nombre: keyof ResidentesController) =>
  ResidentesController.prototype[nombre];

describe('ResidentesController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión, comunidad activa y cargo de Administrador en todas las rutas', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, ResidentesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(reflector.get(ROLES_KEY, ResidentesController)).toEqual([
      RolUsuario.ADMINISTRADOR,
    ]);
  });

  it.each([
    ['invitar', 10],
    ['reenviarInvitacion', 5],
    ['asignarCargo', 30],
    ['quitarCargo', 30],
    ['desactivar', 30],
    ['reactivar', 30],
  ] as const)('debe limitar %s a %i por minuto', (nombre, limite) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      limite,
    );
  });

  it.each([['reenviarInvitacion'], ['asignarCargo'], ['desactivar']] as const)(
    'debe responder %s con 200',
    (nombre) => {
      expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
        HttpStatus.OK,
      );
    },
  );
});

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { UnidadesController } from './unidades.controller';

const metodo = (nombre: keyof UnidadesController) =>
  UnidadesController.prototype[nombre];

describe('UnidadesController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión y pertenecer a una comunidad activa', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, UnidadesController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('debe dejar ver las unidades a la directiva y al personal, pero no a los residentes', () => {
    const roles = reflector.get<RolUsuario[]>(ROLES_KEY, metodo('listar'));

    expect(roles).toEqual([
      RolUsuario.ADMINISTRADOR,
      RolUsuario.PRESIDENTE,
      RolUsuario.TESORERO,
      RolUsuario.SECRETARIO,
      RolUsuario.CONSERJE,
    ]);
    expect(roles).not.toContain(RolUsuario.RESIDENTE);
  });

  it.each([['crearLote'], ['editar']] as const)(
    'debe dejar %s solo al Administrador y limitarlo a 30 por minuto',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
        RolUsuario.ADMINISTRADOR,
      ]);
      expect(
        Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre)),
      ).toBe(30);
    },
  );
});

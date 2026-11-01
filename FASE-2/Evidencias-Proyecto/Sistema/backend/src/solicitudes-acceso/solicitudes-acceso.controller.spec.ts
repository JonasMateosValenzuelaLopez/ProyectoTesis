import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../common/enums/rol.enum';
import { SolicitudesAccesoController } from './solicitudes-acceso.controller';

const metodo = (nombre: keyof SolicitudesAccesoController) =>
  SolicitudesAccesoController.prototype[nombre];

describe('SolicitudesAccesoController', () => {
  const reflector = new Reflector();

  it.each([['listar'], ['aprobar'], ['rechazar']] as const)(
    'debe exigir sesión, cargo en la comunidad y rol Administrador en %s',
    (nombre) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, metodo(nombre))).toEqual([
        JwtAuthGuard,
        RolesGuard,
      ]);
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
        RolUsuario.ADMINISTRADOR,
      ]);
    },
  );

  it.each([['listarComunidades'], ['crear']] as const)(
    'debe dejar público %s',
    (nombre) => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, metodo(nombre)),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(GUARDS_METADATA, SolicitudesAccesoController),
      ).toBeUndefined();
    },
  );

  it('debe limitar la creación de solicitudes a 3 por minuto', () => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('crear'))).toBe(
      3,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo('crear'))).toBe(
      60_000,
    );
  });
});

import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { EgresosExencionesController } from './egresos-exenciones.controller';

const metodo = (nombre: keyof EgresosExencionesController) =>
  EgresosExencionesController.prototype[nombre];

const GESTION = [RolUsuario.TESORERO, RolUsuario.ADMINISTRADOR];
const LECTURA = [...GESTION, RolUsuario.PRESIDENTE];

describe('EgresosExencionesController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión, comunidad activa y el módulo de cobros', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, EgresosExencionesController),
    ).toEqual([JwtAuthGuard, RolesGuard]);
    expect(reflector.get(MODULO_KEY, EgresosExencionesController)).toBe(
      CodigoModulo.COBROS,
    );
  });

  it.each([
    ['listarEgresos', LECTURA],
    ['registrarEgreso', GESTION],
    ['visarEgreso', [RolUsuario.PRESIDENTE]],
    ['listarExenciones', LECTURA],
    ['solicitarExencion', [RolUsuario.TESORERO]],
    ['revisarExencion', [RolUsuario.TESORERO]],
    ['resolverExencion', [RolUsuario.PRESIDENTE]],
    ['reporte', LECTURA],
  ] as const)('debe dejar %s a %j', (nombre, roles) => {
    expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual(roles);
  });

  it('debe dejar a cualquier residente pedir una exención de su cuenta', () => {
    expect(
      reflector.get(ROLES_KEY, metodo('solicitarMiExencion')),
    ).toBeUndefined();
  });

  it.each([
    ['visarEgreso'],
    ['revisarExencion'],
    ['resolverExencion'],
  ] as const)('debe responder %s con 200', (nombre) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
      HttpStatus.OK,
    );
  });
});

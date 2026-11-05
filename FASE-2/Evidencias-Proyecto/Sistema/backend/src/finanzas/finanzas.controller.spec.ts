import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { FinanzasController } from './finanzas.controller';

const metodo = (nombre: keyof FinanzasController) =>
  FinanzasController.prototype[nombre];

const GESTION = [RolUsuario.TESORERO, RolUsuario.ADMINISTRADOR];
const LECTURA = [...GESTION, RolUsuario.PRESIDENTE];

describe('FinanzasController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión, comunidad activa y el módulo de cobros', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FinanzasController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(reflector.get(MODULO_KEY, FinanzasController)).toBe(
      CodigoModulo.COBROS,
    );
  });

  it.each([
    ['listarCategorias', GESTION],
    ['crearCategoria', [RolUsuario.TESORERO]],
    ['editarCategoria', [RolUsuario.TESORERO]],
    ['listarCobros', LECTURA],
    ['crearCobro', GESTION],
    ['editarCobro', GESTION],
    ['eliminarCobro', GESTION],
    ['estado', LECTURA],
    ['detalleUnidad', LECTURA],
    ['marcarPagos', GESTION],
    ['anularPago', GESTION],
    ['rechazarAvisos', GESTION],
    ['enviarRecordatorio', GESTION],
  ] as const)('debe dejar %s a %j', (nombre, roles) => {
    expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual(roles);
  });

  it.each([['miCuenta'], ['avisarTransferencia']] as const)(
    'debe dejar %s a cualquier persona de la comunidad',
    (nombre) => {
      expect(reflector.get(ROLES_KEY, metodo(nombre))).toBeUndefined();
    },
  );

  it.each([
    ['crearCobro', 10],
    ['enviarRecordatorio', 3],
    ['avisarTransferencia', 10],
    ['marcarPagos', 30],
  ] as const)('debe limitar %s a %i por minuto', (nombre, limite) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      limite,
    );
  });

  it.each([
    ['eliminarCobro', HttpStatus.NO_CONTENT],
    ['anularPago', HttpStatus.NO_CONTENT],
    ['marcarPagos', HttpStatus.OK],
    ['rechazarAvisos', HttpStatus.OK],
    ['enviarRecordatorio', HttpStatus.OK],
  ] as const)('debe responder %s con %i', (nombre, codigo) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
      codigo,
    );
  });
});

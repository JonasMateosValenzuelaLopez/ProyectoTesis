import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { MarketplaceController } from './marketplace.controller';

const metodo = (nombre: keyof MarketplaceController) =>
  MarketplaceController.prototype[nombre];

describe('MarketplaceController', () => {
  const reflector = new Reflector();

  it('debe exigir sesión, comunidad activa y el módulo del marketplace', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, MarketplaceController)).toEqual(
      [JwtAuthGuard, RolesGuard],
    );
    expect(reflector.get(MODULO_KEY, MarketplaceController)).toBe(
      CodigoModulo.MARKETPLACE,
    );
  });

  it.each([
    ['listar'],
    ['listarSolicitudes'],
    ['publicar'],
    ['detalle'],
    ['editar'],
    ['cerrar'],
    ['reabrir'],
    ['eliminar'],
    ['reportar'],
    ['pedirContacto'],
    ['cancelarSolicitud'],
    ['responderSolicitud'],
    ['marcarVista'],
  ] as const)('debe dejar %s a cualquier persona de la comunidad', (nombre) => {
    expect(reflector.get(ROLES_KEY, metodo(nombre))).toBeUndefined();
  });

  it.each([
    ['listarModeracion'],
    ['ocultar'],
    ['restaurar'],
    ['descartarReportes'],
  ] as const)('debe dejar %s solo al Administrador', (nombre) => {
    expect(reflector.get(ROLES_KEY, metodo(nombre))).toEqual([
      RolUsuario.ADMINISTRADOR,
    ]);
  });

  it.each([
    ['publicar', 10],
    ['reportar', 10],
    ['pedirContacto', 10],
    ['eliminar', 30],
    ['editar', 30],
    ['cerrar', 30],
    ['reabrir', 30],
    ['cancelarSolicitud', 30],
    ['responderSolicitud', 30],
    ['marcarVista', 30],
    ['ocultar', 30],
    ['restaurar', 30],
    ['descartarReportes', 30],
  ] as const)('debe limitar %s a %i por minuto', (nombre, limite) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      limite,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
      60_000,
    );
  });

  it.each([
    ['eliminar', HttpStatus.NO_CONTENT],
    ['cerrar', HttpStatus.OK],
    ['cancelarSolicitud', HttpStatus.NO_CONTENT],
    ['marcarVista', HttpStatus.NO_CONTENT],
    ['responderSolicitud', HttpStatus.OK],
    ['ocultar', HttpStatus.OK],
    ['restaurar', HttpStatus.OK],
    ['descartarReportes', HttpStatus.OK],
  ] as const)('debe responder %s con %i', (nombre, codigo) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo(nombre))).toBe(
      codigo,
    );
  });

  it('debe declarar las rutas fijas antes de la ruta con id del aviso', () => {
    const rutas = Object.getOwnPropertyNames(MarketplaceController.prototype)
      .filter((nombre) => nombre !== 'constructor')
      .map(
        (nombre) =>
          Reflect.getMetadata(
            'path',
            metodo(nombre as keyof MarketplaceController),
          ) as string,
      );

    expect(rutas.indexOf('solicitudes')).toBeLessThan(
      rutas.indexOf(':idProducto'),
    );
    expect(rutas.indexOf('moderacion')).toBeLessThan(
      rutas.indexOf(':idProducto'),
    );
  });
});

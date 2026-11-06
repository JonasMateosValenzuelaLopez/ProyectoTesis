import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { MODULO_KEY } from '../auth/decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { AutorizacionesController } from './autorizaciones.controller';
import { InvitacionesController } from './invitaciones.controller';
import { PorteriaController } from './porteria.controller';

const reflector = new Reflector();
const limite = (metodo: object) =>
  Reflect.getMetadata('THROTTLER:LIMITdefault', metodo) as number;

describe('Controladores de accesos', () => {
  it.each([
    [InvitacionesController, CodigoModulo.INVITACIONES_QR],
    [PorteriaController, CodigoModulo.CONSERJERIA],
    [AutorizacionesController, CodigoModulo.CONSERJERIA],
  ] as const)(
    '%p debe exigir sesión, comunidad activa y el módulo %s',
    (controlador, modulo) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controlador)).toEqual([
        JwtAuthGuard,
        RolesGuard,
      ]);
      expect(reflector.get(MODULO_KEY, controlador)).toBe(modulo);
    },
  );

  it('la garita debe quedar solo para Conserje y Administrador', () => {
    expect(reflector.get(ROLES_KEY, PorteriaController)).toEqual([
      RolUsuario.CONSERJE,
      RolUsuario.ADMINISTRADOR,
    ]);
  });

  it('invitaciones y respuestas deben quedar para cualquier persona de la comunidad', () => {
    expect(reflector.get(ROLES_KEY, InvitacionesController)).toBeUndefined();
    expect(reflector.get(ROLES_KEY, AutorizacionesController)).toBeUndefined();
  });

  it.each([
    [InvitacionesController.prototype.crear, 10],
    [InvitacionesController.prototype.cancelar, 30],
    [AutorizacionesController.prototype.responder, 30],
    [PorteriaController.prototype.validar, 60],
    [PorteriaController.prototype.ingresoConCodigo, 60],
    [PorteriaController.prototype.ingresoPorInvitacion, 60],
    [PorteriaController.prototype.ingresoSinInvitacion, 60],
    [PorteriaController.prototype.registrarSalida, 60],
    [PorteriaController.prototype.resolverPorTelefono, 60],
  ])('debe limitar las escrituras (%#) a %i por minuto', (metodo, valor) => {
    expect(limite(metodo)).toBe(valor);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo)).toBe(60_000);
  });

  it.each([
    [InvitacionesController.prototype.cancelar],
    [AutorizacionesController.prototype.responder],
    [PorteriaController.prototype.validar],
    [PorteriaController.prototype.registrarSalida],
    [PorteriaController.prototype.resolverPorTelefono],
  ])('debe responder 200 en las acciones que no crean filas (%#)', (metodo) => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo)).toBe(HttpStatus.OK);
  });
});

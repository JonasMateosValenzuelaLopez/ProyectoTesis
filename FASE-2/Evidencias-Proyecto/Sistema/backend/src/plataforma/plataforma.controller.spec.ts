import { HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlataformaGuard } from '../auth/guards/plataforma.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BitacoraPlataformaController } from './bitacora-plataforma.controller';
import { PlataformaController } from './plataforma.controller';

const metodo = (nombre: keyof PlataformaController) =>
  PlataformaController.prototype[nombre];

describe('PlataformaController', () => {
  it('debe dejar entrar solo al equipo EntreCasas, sin exigir comunidad', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, PlataformaController);

    expect(guards).toEqual([JwtAuthGuard, PlataformaGuard]);
    expect(guards).not.toContain(RolesGuard);
  });

  it('debe proteger la bitácora de plataforma con los mismos guards', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, BitacoraPlataformaController),
    ).toEqual([JwtAuthGuard, PlataformaGuard]);
  });

  it.each([
    ['suspender'],
    ['reactivar'],
    ['cambiarModulo'],
    ['cambiarTipo'],
  ] as const)('debe limitar %s a 30 peticiones por minuto', (nombre) => {
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre))).toBe(
      30,
    );
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', metodo(nombre))).toBe(
      60_000,
    );
  });

  it.each([['listar'], ['ficha']] as const)(
    'no debe bajar el límite global en %s',
    (nombre) => {
      expect(
        Reflect.getMetadata('THROTTLER:LIMITdefault', metodo(nombre)),
      ).toBeUndefined();
    },
  );

  it('debe responder suspender con 200, porque no crea un recurso', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, metodo('suspender'))).toBe(
      HttpStatus.OK,
    );
  });
});

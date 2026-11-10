import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlataformaGuard } from '../auth/guards/plataforma.guard';
import { PersonasPlataformaController } from './personas-plataforma.controller';

const metodo = (nombre: keyof PersonasPlataformaController) =>
  PersonasPlataformaController.prototype[nombre];

describe('PersonasPlataformaController', () => {
  it('debe exigir sesión del equipo EntreCasas en todas las rutas', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PersonasPlataformaController),
    ).toEqual([JwtAuthGuard, PlataformaGuard]);
  });

  it.each([['bloquear'], ['desbloquear']] as const)(
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

  it('debe limitar el reenvío de acceso a 10 peticiones por minuto', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('reenviarAcceso')),
    ).toBe(10);
    expect(
      Reflect.getMetadata('THROTTLER:TTLdefault', metodo('reenviarAcceso')),
    ).toBe(60_000);
  });

  it('no debe bajar el límite general del listado', () => {
    expect(
      Reflect.getMetadata('THROTTLER:LIMITdefault', metodo('listar')),
    ).toBeUndefined();
  });
});

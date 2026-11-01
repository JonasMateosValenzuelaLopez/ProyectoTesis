import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsuarioAutenticado } from '../../common/interfaces/jwt-payload.interface';
import { PlataformaGuard } from './plataforma.guard';

describe('PlataformaGuard', () => {
  const target = new PlataformaGuard();

  const crearContexto = (user?: UsuarioAutenticado) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  it('debe permitir el acceso al equipo EntreCasas', () => {
    expect(
      target.canActivate(crearContexto({ idUsuario: 1, esPlataforma: true })),
    ).toBe(true);
  });

  it('debe lanzar ForbiddenException a un usuario de comunidad', () => {
    expect(() =>
      target.canActivate(crearContexto({ idUsuario: 7, esPlataforma: false })),
    ).toThrow(
      new ForbiddenException('Esta sección es solo para el equipo EntreCasas'),
    );
  });

  it('debe lanzar UnauthorizedException cuando no hay usuario autenticado', () => {
    expect(() => target.canActivate(crearContexto())).toThrow(
      UnauthorizedException,
    );
  });
});

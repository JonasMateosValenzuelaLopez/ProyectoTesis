import { RolUsuario } from '../enums/rol.enum';

// El token solo identifica al usuario; la comunidad y los roles se resuelven
// en cada request (ver RolesGuard), así un cambio de roles aplica al instante.
export interface JwtPayload {
  sub: number;
  iat?: number;
}

// Lo que queda disponible en `request.user` tras pasar por JwtAuthGuard.
export interface UsuarioAutenticado {
  idUsuario: number;
}

// Lo que queda disponible en `request.red` tras pasar por RolesGuard.
export interface ContextoRed {
  idRed: number;
  idMembresia: number;
  idUnidad: number | null;
  roles: RolUsuario[];
}

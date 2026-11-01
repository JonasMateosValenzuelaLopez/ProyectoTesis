import { CodigoModulo } from '../enums/modulo.enum';
import { RolUsuario } from '../enums/rol.enum';

export interface JwtPayload {
  sub: number;
  iat?: number;
}

export interface UsuarioAutenticado {
  idUsuario: number;
  esPlataforma: boolean;
}

export interface ContextoRed {
  idRed: number;
  roles: RolUsuario[];
  modulos: CodigoModulo[];
  idsUnidades: number[];
}

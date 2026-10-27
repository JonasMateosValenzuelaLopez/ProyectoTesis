import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { UsuarioAutenticado } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class PlataformaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const usuario = context.switchToHttp().getRequest<Request>().user as
      UsuarioAutenticado | undefined;
    if (!usuario) {
      throw new UnauthorizedException();
    }
    if (!usuario.esPlataforma) {
      throw new ForbiddenException(
        'Esta sección es solo para el equipo EntreCasas',
      );
    }
    return true;
  }
}

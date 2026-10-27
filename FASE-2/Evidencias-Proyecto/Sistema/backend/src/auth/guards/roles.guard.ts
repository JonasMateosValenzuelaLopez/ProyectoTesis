import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { RolUsuario } from '../../common/enums/rol.enum';
import {
  ContextoRed,
  UsuarioAutenticado,
} from '../../common/interfaces/jwt-payload.interface';
import { Membresia } from '../../usuarios/entities/membresia.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

export const HEADER_RED = 'x-red-id';

/**
 * Valida que el usuario pertenezca (con membresía activa) a la comunidad
 * indicada en el header `X-Red-Id` y, si la ruta usa @Roles, que tenga alguno
 * de esos roles en esa comunidad. Deja el contexto en `request.red`.
 *
 * Usar siempre después de JwtAuthGuard: @UseGuards(JwtAuthGuard, RolesGuard).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { red?: ContextoRed }>();
    const usuario = request.user as UsuarioAutenticado | undefined;
    if (!usuario) {
      throw new UnauthorizedException();
    }

    const idRed = Number(request.header(HEADER_RED));
    if (!Number.isInteger(idRed) || idRed <= 0) {
      throw new BadRequestException(
        'Debes indicar la comunidad en el header X-Red-Id',
      );
    }

    // Si la red tiene borrado lógico, TypeORM la excluye del JOIN y `red`
    // llega en null: la membresía no da acceso a una comunidad eliminada.
    const membresia = await this.membresiasRepository.findOne({
      where: { idUsuario: usuario.idUsuario, idRed, estado: true },
      relations: { roles: true, red: true },
    });
    if (!membresia?.red) {
      throw new ForbiddenException('No perteneces a esta comunidad');
    }

    const roles = membresia.roles.map((rol) => rol.idRol as RolUsuario);
    request.red = {
      idRed,
      idMembresia: membresia.idMembresia,
      idUnidad: membresia.idUnidad,
      roles,
    };

    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      rolesPermitidos?.length &&
      !roles.some((rol) => rolesPermitidos.includes(rol))
    ) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }
    return true;
  }
}

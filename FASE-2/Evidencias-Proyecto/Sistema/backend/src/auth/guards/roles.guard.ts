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
import { CodigoModulo } from '../../common/enums/modulo.enum';
import { RolUsuario } from '../../common/enums/rol.enum';
import {
  ContextoRed,
  UsuarioAutenticado,
} from '../../common/interfaces/jwt-payload.interface';
import { condicionVigente, fechaHoy } from '../../common/utils/vigencia';
import { EstadoRedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { RedModulo } from '../../redes-vecinales/entities/red-modulo.entity';
import { Membresia } from '../../usuarios/entities/membresia.entity';
import { Residencia } from '../../usuarios/entities/residencia.entity';
import { MODULO_KEY } from '../decorators/requiere-modulo.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

export const HEADER_RED = 'x-red-id';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    @InjectRepository(RedModulo)
    private readonly redModulosRepository: Repository<RedModulo>,
    @InjectRepository(Residencia)
    private readonly residenciasRepository: Repository<Residencia>,
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

    const hoy = fechaHoy();
    const membresias = (
      await this.membresiasRepository.find({
        where: {
          idUsuario: usuario.idUsuario,
          idRed,
          activo: true,
          ...condicionVigente(hoy),
        },
        relations: { red: true },
      })
    ).filter((membresia) => membresia.red);
    if (membresias.length === 0) {
      throw new ForbiddenException('No perteneces a esta comunidad');
    }
    const { red } = membresias[0];
    if (red.estado === EstadoRedVecinal.SUSPENDIDA) {
      throw new ForbiddenException(
        red.motivoSuspension
          ? `Esta comunidad está suspendida: ${red.motivoSuspension}`
          : 'Esta comunidad está suspendida.',
      );
    }

    const modulos = (
      await this.redModulosRepository.find({ where: { idRed, activo: true } })
    ).map((redModulo) => redModulo.codigoModulo);
    const roles = new Set(membresias.map((membresia) => membresia.idRol));
    if (
      roles.has(RolUsuario.PRESIDENTE) &&
      !modulos.includes(CodigoModulo.ADMINISTRADOR_EXTERNO)
    ) {
      roles.add(RolUsuario.ADMINISTRADOR);
    }
    const residencias = await this.residenciasRepository.find({
      where: {
        idUsuario: usuario.idUsuario,
        unidad: { idRed },
        ...condicionVigente(hoy),
      },
      relations: { unidad: true },
    });

    request.red = {
      idRed,
      roles: [...roles],
      modulos,
      idsUnidades: residencias
        .filter((residencia) => residencia.unidad)
        .map((residencia) => residencia.idUnidad),
    };

    const modulo = this.reflector.getAllAndOverride<CodigoModulo | undefined>(
      MODULO_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (modulo && !modulos.includes(modulo)) {
      throw new ForbiddenException(
        'Esta función no está activa en tu comunidad',
      );
    }

    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (
      rolesPermitidos?.length &&
      !rolesPermitidos.some((rol) => roles.has(rol))
    ) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta acción',
      );
    }
    return true;
  }
}

import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { ContextoRed } from '../../common/interfaces/jwt-payload.interface';

// Comunidad activa del request; requiere RolesGuard en la ruta. Sin el guard
// no hay contexto: se falla con un mensaje claro en vez de pasar undefined.
export const RedActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ContextoRed => {
    const red = context
      .switchToHttp()
      .getRequest<Request & { red?: ContextoRed }>().red;
    if (!red) {
      throw new InternalServerErrorException(
        '@RedActual() requiere @UseGuards(JwtAuthGuard, RolesGuard) en la ruta',
      );
    }
    return red;
  },
);

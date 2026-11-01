import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { ContextoRed } from '../../common/interfaces/jwt-payload.interface';

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

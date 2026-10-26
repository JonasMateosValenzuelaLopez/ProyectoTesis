import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Traduce los errores de la BD que son culpa de los datos (no del servidor)
 * a respuestas HTTP útiles. El caso típico es una carrera: dos peticiones
 * pasan la validación a la vez y la segunda choca con un índice único.
 * El resto se registra y responde 500 sin exponer el SQL.
 */
@Catch(QueryFailedError)
export class ErroresBdFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErroresBdFilter.name);

  catch(error: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    const respuesta = host.switchToHttp().getResponse<Response>();
    const http = this.traducir(error);
    respuesta.status(http.getStatus()).json(http.getResponse());
  }

  private traducir(error: QueryFailedError & { code?: string }): HttpException {
    switch (error.code) {
      case 'ER_DUP_ENTRY':
        return new ConflictException(
          'Ya existe un registro con esos datos. Actualiza la página e intenta de nuevo.',
        );
      case 'ER_NO_REFERENCED_ROW_2':
        return new BadRequestException('Uno de los datos indicados no existe.');
      default:
        this.logger.error(
          `Error de BD no controlado (${error.code ?? 'sin código'})`,
          error.stack,
        );
        return new InternalServerErrorException();
    }
  }
}

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
      case 'ER_LOCK_DEADLOCK':
      case 'ER_LOCK_WAIT_TIMEOUT':
        return new ConflictException(
          'Otra persona estaba modificando estos datos. Intenta de nuevo.',
        );
      default:
        this.logger.error(
          `Error de BD no controlado (${error.code ?? 'sin código'})`,
          error.stack,
        );
        return new InternalServerErrorException();
    }
  }
}

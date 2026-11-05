import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { CodigoError } from '../errores/codigo-error.enum';
import {
  nuevoIdSolicitud,
  SolicitudConId,
} from '../errores/id-solicitud.middleware';
import { UsuarioAutenticado } from '../interfaces/jwt-payload.interface';

interface ErrorTraducido {
  status: number;
  codigo: CodigoError;
  mensaje: string;
  campos?: Record<string, string>;
}

const CODIGO_POR_ESTADO: Partial<Record<number, CodigoError>> = {
  [HttpStatus.BAD_REQUEST]: CodigoError.VALIDACION,
  [HttpStatus.UNAUTHORIZED]: CodigoError.SESION_EXPIRADA,
  [HttpStatus.FORBIDDEN]: CodigoError.SIN_PERMISO,
  [HttpStatus.NOT_FOUND]: CodigoError.NO_ENCONTRADO,
  [HttpStatus.CONFLICT]: CodigoError.CONFLICTO,
  [HttpStatus.TOO_MANY_REQUESTS]: CodigoError.DEMASIADAS_SOLICITUDES,
};

const MENSAJE_POR_CODIGO: Record<CodigoError, string> = {
  [CodigoError.VALIDACION]: 'Revisa los datos ingresados',
  [CodigoError.SESION_EXPIRADA]:
    'Tu sesión expiró o no es válida. Inicia sesión nuevamente.',
  [CodigoError.CONTRASENA_CAMBIADA]:
    'Tu contraseña cambió. Inicia sesión nuevamente.',
  [CodigoError.CUENTA_BLOQUEADA]:
    'Tu cuenta está bloqueada. Contacta al equipo EntreCasas.',
  [CodigoError.COMUNIDAD_SUSPENDIDA]: 'Esta comunidad está suspendida.',
  [CodigoError.SIN_PERMISO]: 'No tienes permisos para realizar esta acción',
  [CodigoError.MODULO_INACTIVO]: 'Esta función no está activa en tu comunidad',
  [CodigoError.NO_ENCONTRADO]: 'Lo que buscas no existe o fue eliminado',
  [CodigoError.CONFLICTO]:
    'Los datos cambiaron mientras trabajabas. Actualiza e intenta de nuevo.',
  [CodigoError.DEMASIADAS_SOLICITUDES]:
    'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
  [CodigoError.SOLICITUD_INVALIDA]: 'La solicitud no es válida',
  [CodigoError.ERROR_INTERNO]:
    'Ocurrió un problema. Intenta de nuevo en unos minutos.',
};

const ERRORES_BD: Record<string, ErrorTraducido> = {
  ER_DUP_ENTRY: {
    status: HttpStatus.CONFLICT,
    codigo: CodigoError.CONFLICTO,
    mensaje:
      'Ya existe un registro con esos datos. Actualiza la página e intenta de nuevo.',
  },
  ER_NO_REFERENCED_ROW_2: {
    status: HttpStatus.BAD_REQUEST,
    codigo: CodigoError.VALIDACION,
    mensaje: 'Uno de los datos indicados no existe.',
  },
  ER_CONSTRAINT_FAILED: {
    status: HttpStatus.BAD_REQUEST,
    codigo: CodigoError.VALIDACION,
    mensaje: 'Los datos no cumplen las reglas de la plataforma.',
  },
  ER_LOCK_DEADLOCK: {
    status: HttpStatus.CONFLICT,
    codigo: CodigoError.CONFLICTO,
    mensaje: 'Otra persona estaba modificando estos datos. Intenta de nuevo.',
  },
  ER_LOCK_WAIT_TIMEOUT: {
    status: HttpStatus.CONFLICT,
    codigo: CodigoError.CONFLICTO,
    mensaje: 'Otra persona estaba modificando estos datos. Intenta de nuevo.',
  },
};

const MENSAJE_JSON_INVALIDO = 'El cuerpo de la solicitud no es un JSON válido';

const MENSAJES_EN_INGLES =
  /^(Bad Request|Unauthorized|Forbidden|Not Found|Conflict|Too Many Requests|Internal Server Error|Payload Too Large|request entity too large|Method Not Allowed|Unsupported Media Type|Cannot [A-Z]+ .*|ThrottlerException.*)$/;

@Catch()
export class ErroresApiFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErroresApiFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const contexto = host.switchToHttp();
    const solicitud = contexto.getRequest<SolicitudConId>();
    const respuesta = contexto.getResponse<Response>();
    const idSolicitud = solicitud.idSolicitud ?? nuevoIdSolicitud();
    const traducido = this.traducir(error);

    if (traducido.status >= 500) {
      const usuario = solicitud.user as UsuarioAutenticado | undefined;
      this.logger.error(
        `[${idSolicitud}] ${solicitud.method} ${solicitud.originalUrl} ` +
          `usuario=${usuario?.idUsuario ?? '-'} comunidad=${solicitud.header('x-red-id') ?? '-'}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    respuesta.status(traducido.status).json({
      statusCode: traducido.status,
      codigo: traducido.codigo,
      mensaje: traducido.mensaje,
      ...(traducido.campos ? { campos: traducido.campos } : {}),
      idSolicitud,
    });
  }

  private traducir(error: unknown): ErrorTraducido {
    if (error instanceof QueryFailedError) {
      const conocido = ERRORES_BD[(error as { code?: string }).code ?? ''];
      return conocido ?? this.interno();
    }
    if (error instanceof HttpException) {
      return this.desdeHttp(error);
    }
    if (this.esJsonInvalido(error)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        codigo: CodigoError.VALIDACION,
        mensaje: MENSAJE_JSON_INVALIDO,
      };
    }
    return this.interno();
  }

  private desdeHttp(error: HttpException): ErrorTraducido {
    const status = error.getStatus();
    if (status >= 500) {
      return { ...this.interno(), status };
    }
    const cuerpo = error.getResponse();
    const datos =
      typeof cuerpo === 'object' && cuerpo !== null
        ? (cuerpo as {
            codigo?: CodigoError;
            message?: unknown;
            campos?: Record<string, string>;
          })
        : {};
    const codigo =
      datos.codigo ??
      CODIGO_POR_ESTADO[status] ??
      CodigoError.SOLICITUD_INVALIDA;
    const texto =
      typeof cuerpo === 'string'
        ? cuerpo
        : typeof datos.message === 'string'
          ? datos.message
          : Array.isArray(datos.message)
            ? datos.message.join('. ')
            : '';
    return {
      status,
      codigo,
      mensaje: this.mensajeDe(error, status, codigo, texto),
      ...(datos.campos ? { campos: datos.campos } : {}),
    };
  }

  private mensajeDe(
    error: HttpException,
    status: number,
    codigo: CodigoError,
    texto: string,
  ) {
    if (
      status === HttpStatus.BAD_REQUEST &&
      (this.esJsonInvalido(error.cause) || / in JSON\b|\bJSON at /.test(texto))
    ) {
      return MENSAJE_JSON_INVALIDO;
    }
    if (status === HttpStatus.NOT_FOUND && texto.startsWith('Cannot ')) {
      return 'La ruta solicitada no existe';
    }
    return !texto || MENSAJES_EN_INGLES.test(texto)
      ? MENSAJE_POR_CODIGO[codigo]
      : texto;
  }

  private esJsonInvalido(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { type?: string }).type === 'entity.parse.failed'
    );
  }

  private interno(): ErrorTraducido {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      codigo: CodigoError.ERROR_INTERNO,
      mensaje: MENSAJE_POR_CODIGO[CodigoError.ERROR_INTERNO],
    };
  }
}

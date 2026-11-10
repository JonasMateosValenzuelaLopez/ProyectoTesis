import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { QueryFailedError } from 'typeorm';
import { CodigoError } from '../errores/codigo-error.enum';
import { errorDeValidacion } from '../utils/validacion';
import { ErroresApiFilter } from './errores-api.filter';

describe('ErroresApiFilter', () => {
  let target: ErroresApiFilter;
  let mockRespuesta: { status: jest.Mock; json: jest.Mock };
  let solicitud: Record<string, unknown>;
  let espiaError: jest.SpyInstance;
  let espiaWarn: jest.SpyInstance;

  const crearHost = () =>
    ({
      switchToHttp: () => ({
        getRequest: () => solicitud,
        getResponse: () => mockRespuesta,
      }),
    }) as unknown as ArgumentsHost;

  const respuestaDe = (error: unknown) => {
    target.catch(error, crearHost());
    return mockRespuesta.json.mock.calls[0][0] as Record<string, unknown>;
  };

  const errorBd = (code: string) =>
    new QueryFailedError(
      'INSERT INTO usuarios ...',
      [],
      Object.assign(new Error(`${code}: detalle del driver`), { code }),
    );

  beforeEach(() => {
    target = new ErroresApiFilter();
    mockRespuesta = { status: jest.fn(), json: jest.fn() };
    mockRespuesta.status.mockReturnValue(mockRespuesta);
    solicitud = {
      idSolicitud: 'abc123def456',
      method: 'POST',
      originalUrl: '/unidades/lote',
      user: { idUsuario: 7 },
      header: (nombre: string) => (nombre === 'x-red-id' ? '3' : undefined),
    };
    espiaError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    espiaWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe responder los errores de validación con código, mensaje general, campos y el id de la solicitud', () => {
    const cuerpo = respuestaDe(
      errorDeValidacion([
        {
          property: 'correo',
          constraints: { isEmail: 'El correo no es válido' },
          children: [],
        },
      ]),
    );

    expect(mockRespuesta.status).toHaveBeenCalledWith(400);
    expect(cuerpo).toEqual({
      statusCode: 400,
      codigo: CodigoError.VALIDACION,
      mensaje: 'Revisa los datos ingresados',
      campos: { correo: 'El correo no es válido' },
      idSolicitud: 'abc123def456',
    });
  });

  it.each([
    [new BadRequestException('La unidad no pertenece'), CodigoError.VALIDACION],
    [new UnauthorizedException('Sesión inválida'), CodigoError.SESION_EXPIRADA],
    [new ForbiddenException('No perteneces'), CodigoError.SIN_PERMISO],
    [new NotFoundException('Unidad no encontrada'), CodigoError.NO_ENCONTRADO],
    [new ConflictException('Ya existe'), CodigoError.CONFLICTO],
    [
      new PayloadTooLargeException('Muy grande'),
      CodigoError.SOLICITUD_INVALIDA,
    ],
  ])(
    'debe asignar el código según el estado y conservar el mensaje propio (%s)',
    (excepcion: HttpException, codigo: CodigoError) => {
      const cuerpo = respuestaDe(excepcion);

      expect(cuerpo).toEqual({
        statusCode: excepcion.getStatus(),
        codigo,
        mensaje: excepcion.message,
        idSolicitud: 'abc123def456',
      });
      expect(espiaError).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      CodigoError.COMUNIDAD_SUSPENDIDA,
      new ForbiddenException({
        codigo: CodigoError.COMUNIDAD_SUSPENDIDA,
        message: 'Suspendida: deuda',
      }),
    ],
    [
      CodigoError.CONTRASENA_CAMBIADA,
      new UnauthorizedException({
        codigo: CodigoError.CONTRASENA_CAMBIADA,
        message: 'Tu contraseña cambió',
      }),
    ],
  ])('debe respetar el código específico %s', (codigo, excepcion) => {
    const cuerpo = respuestaDe(excepcion);

    expect(cuerpo).toEqual(
      expect.objectContaining({ codigo, mensaje: excepcion.message }),
    );
  });

  it.each([
    [
      new UnauthorizedException(),
      'Tu sesión expiró o no es válida. Inicia sesión nuevamente.',
    ],
    [new ForbiddenException(), 'No tienes permisos para realizar esta acción'],
    [
      new NotFoundException('Cannot GET /no-existe'),
      'La ruta solicitada no existe',
    ],
    [
      new ThrottlerException(),
      'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    ],
  ])('debe reemplazar el mensaje en inglés de %s', (excepcion, mensaje) => {
    const cuerpo = respuestaDe(excepcion);

    expect(cuerpo.mensaje).toBe(mensaje);
  });

  it('debe responder 429 con su código', () => {
    const cuerpo = respuestaDe(new ThrottlerException());

    expect(mockRespuesta.status).toHaveBeenCalledWith(
      HttpStatus.TOO_MANY_REQUESTS,
    );
    expect(cuerpo.codigo).toBe(CodigoError.DEMASIADAS_SOLICITUDES);
  });

  it('debe responder un JSON mal formado como error de validación', () => {
    const cuerpo = respuestaDe(
      Object.assign(new SyntaxError('Unexpected token } in JSON'), {
        type: 'entity.parse.failed',
        status: 400,
      }),
    );

    expect(mockRespuesta.status).toHaveBeenCalledWith(400);
    expect(cuerpo).toEqual(
      expect.objectContaining({
        codigo: CodigoError.VALIDACION,
        mensaje: 'El cuerpo de la solicitud no es un JSON válido',
      }),
    );
  });

  it('debe traducir el JSON mal formado que Nest convierte en 400', () => {
    const cuerpo = respuestaDe(
      new BadRequestException(
        'Expected double-quoted property name in JSON at position 15 (line 1 column 16)',
      ),
    );

    expect(cuerpo).toEqual(
      expect.objectContaining({
        codigo: CodigoError.VALIDACION,
        mensaje: 'El cuerpo de la solicitud no es un JSON válido',
      }),
    );
  });

  describe('errores de la base de datos', () => {
    it.each([
      ['ER_DUP_ENTRY', 409, CodigoError.CONFLICTO],
      ['ER_NO_REFERENCED_ROW_2', 400, CodigoError.VALIDACION],
      ['ER_CONSTRAINT_FAILED', 400, CodigoError.VALIDACION],
      ['ER_LOCK_DEADLOCK', 409, CodigoError.CONFLICTO],
      ['ER_LOCK_WAIT_TIMEOUT', 409, CodigoError.CONFLICTO],
    ])('debe traducir %s a %i', (code, status, codigo) => {
      const cuerpo = respuestaDe(errorBd(code));

      expect(mockRespuesta.status).toHaveBeenCalledWith(status);
      expect(cuerpo.codigo).toBe(codigo);
      expect(espiaError).not.toHaveBeenCalled();
      expect(espiaWarn).toHaveBeenCalledWith(
        `[abc123def456] POST /unidades/lote usuario=7 comunidad=3 bd=${code} restriccion=-`,
      );
    });

    it('debe registrar el nombre de la restricción sin los valores de la fila', () => {
      const error = new QueryFailedError(
        'INSERT INTO usuarios ...',
        [],
        Object.assign(
          new Error(
            "Duplicate entry 'ana@correo.cl' for key 'uq_usuario_correo'",
          ),
          { code: 'ER_DUP_ENTRY' },
        ),
      );

      respuestaDe(error);

      const mensaje = espiaWarn.mock.calls[0][0] as string;
      expect(mensaje).toContain(
        'bd=ER_DUP_ENTRY restriccion=uq_usuario_correo',
      );
      expect(mensaje).not.toContain('ana@correo.cl');
    });

    it('debe registrar la restricción CHECK que falló', () => {
      const error = new QueryFailedError(
        'INSERT INTO egresos ...',
        [],
        Object.assign(
          new Error(
            'CONSTRAINT `chk_egreso_visado` failed for `entrecasas_db`.`egresos`',
          ),
          { code: 'ER_CONSTRAINT_FAILED' },
        ),
      );

      respuestaDe(error);

      expect(espiaWarn.mock.calls[0][0]).toContain(
        'restriccion=chk_egreso_visado',
      );
    });
  });

  describe('errores internos', () => {
    it.each([
      ['un error de BD no controlado', errorBd('ER_BAD_FIELD_ERROR')],
      ['una excepción cualquiera', new TypeError('x is undefined')],
      ['un 500 de Nest', new InternalServerErrorException('detalle técnico')],
    ])(
      'con %s debe responder 500 sin detalles y registrarlo con el id',
      (_caso, error) => {
        const cuerpo = respuestaDe(error);

        expect(mockRespuesta.status).toHaveBeenCalledWith(500);
        expect(cuerpo).toEqual({
          statusCode: 500,
          codigo: CodigoError.ERROR_INTERNO,
          mensaje: 'Ocurrió un problema. Intenta de nuevo en unos minutos.',
          idSolicitud: 'abc123def456',
        });
        expect(JSON.stringify(cuerpo)).not.toContain('detalle');
        expect(espiaError).toHaveBeenCalledWith(
          '[abc123def456] POST /unidades/lote usuario=7 comunidad=3',
          expect.any(String),
        );
      },
    );
  });

  it('debe generar un id cuando la solicitud no lo trae', () => {
    delete solicitud.idSolicitud;

    const cuerpo = respuestaDe(new NotFoundException('No existe'));

    expect(cuerpo.idSolicitud).toMatch(/^[0-9a-f]{12}$/);
  });
});

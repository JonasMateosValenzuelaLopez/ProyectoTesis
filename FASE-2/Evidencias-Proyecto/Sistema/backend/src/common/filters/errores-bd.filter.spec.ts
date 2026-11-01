import { ArgumentsHost, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ErroresBdFilter } from './errores-bd.filter';

describe('ErroresBdFilter', () => {
  let target: ErroresBdFilter;
  let mockRespuesta: { status: jest.Mock; json: jest.Mock };
  let espiaError: jest.SpyInstance;

  const crearError = (code: string) =>
    new QueryFailedError(
      'INSERT INTO usuarios ...',
      [],
      Object.assign(new Error(`${code}: detalle del driver`), { code }),
    );

  const crearHost = () =>
    ({
      switchToHttp: () => ({ getResponse: () => mockRespuesta }),
    }) as unknown as ArgumentsHost;

  beforeEach(() => {
    target = new ErroresBdFilter();
    mockRespuesta = { status: jest.fn(), json: jest.fn() };
    mockRespuesta.status.mockReturnValue(mockRespuesta);
    espiaError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('catch', () => {
    it('debe responder 409 cuando se viola un índice único', () => {
      target.catch(crearError('ER_DUP_ENTRY'), crearHost());

      expect(mockRespuesta.status).toHaveBeenCalledWith(409);
      expect(mockRespuesta.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          message:
            'Ya existe un registro con esos datos. Actualiza la página e intenta de nuevo.',
        }),
      );
      expect(espiaError).not.toHaveBeenCalled();
    });

    it('debe responder 400 cuando una clave foránea no existe', () => {
      target.catch(crearError('ER_NO_REFERENCED_ROW_2'), crearHost());

      expect(mockRespuesta.status).toHaveBeenCalledWith(400);
      expect(mockRespuesta.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Uno de los datos indicados no existe.',
        }),
      );
    });

    it.each([['ER_LOCK_DEADLOCK'], ['ER_LOCK_WAIT_TIMEOUT']])(
      'debe responder 409 para reintentar cuando hay %s',
      (codigo) => {
        target.catch(crearError(codigo), crearHost());

        expect(mockRespuesta.status).toHaveBeenCalledWith(409);
        expect(mockRespuesta.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message:
              'Otra persona estaba modificando estos datos. Intenta de nuevo.',
          }),
        );
        expect(espiaError).not.toHaveBeenCalled();
      },
    );

    it('debe responder 500 sin exponer el SQL y registrar el error en otros casos', () => {
      target.catch(crearError('ER_BAD_FIELD_ERROR'), crearHost());

      expect(mockRespuesta.status).toHaveBeenCalledWith(500);
      const cuerpo = JSON.stringify(mockRespuesta.json.mock.calls[0][0]);
      expect(cuerpo).not.toContain('INSERT');
      expect(cuerpo).not.toContain('detalle del driver');
      expect(espiaError).toHaveBeenCalledWith(
        'Error de BD no controlado (ER_BAD_FIELD_ERROR)',
        expect.any(String),
      );
    });
  });
});

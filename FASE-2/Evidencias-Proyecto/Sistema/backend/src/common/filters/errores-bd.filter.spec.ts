import { ArgumentsHost, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ErroresBdFilter } from './errores-bd.filter';

describe('ErroresBdFilter', () => {
  let target: ErroresBdFilter;
  let mockRespuesta: { status: jest.Mock; json: jest.Mock };
  let espiaError: jest.SpyInstance;

  // TypeORM copia las propiedades del error del driver (code, errno, sql...).
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
      // Act
      target.catch(crearError('ER_DUP_ENTRY'), crearHost());

      // Assert
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
      // Act
      target.catch(crearError('ER_NO_REFERENCED_ROW_2'), crearHost());

      // Assert
      expect(mockRespuesta.status).toHaveBeenCalledWith(400);
      expect(mockRespuesta.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Uno de los datos indicados no existe.',
        }),
      );
    });

    it('debe responder 500 sin exponer el SQL y registrar el error en otros casos', () => {
      // Act
      target.catch(crearError('ER_LOCK_DEADLOCK'), crearHost());

      // Assert
      expect(mockRespuesta.status).toHaveBeenCalledWith(500);
      const cuerpo = JSON.stringify(mockRespuesta.json.mock.calls[0][0]);
      expect(cuerpo).not.toContain('INSERT');
      expect(cuerpo).not.toContain('detalle del driver');
      expect(espiaError).toHaveBeenCalledWith(
        'Error de BD no controlado (ER_LOCK_DEADLOCK)',
        expect.any(String),
      );
    });
  });
});

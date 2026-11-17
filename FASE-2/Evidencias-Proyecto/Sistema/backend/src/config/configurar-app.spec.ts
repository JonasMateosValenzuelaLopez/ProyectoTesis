import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  asignarIdSolicitud,
  HEADER_ID_SOLICITUD,
} from '../common/errores/id-solicitud.middleware';
import { configurarApp } from './configurar-app';

describe('configurarApp', () => {
  let mockApp: jest.Mocked<
    Pick<
      NestExpressApplication,
      'use' | 'set' | 'useGlobalPipes' | 'enableCors'
    >
  >;
  const entornoOriginal = { ...process.env };

  beforeEach(() => {
    mockApp = {
      use: jest.fn(),
      set: jest.fn(),
      useGlobalPipes: jest.fn(),
      enableCors: jest.fn(),
    } as unknown as typeof mockApp;
    jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    delete process.env.TRUST_PROXY;
    process.env.CORS_ORIGINS = 'http://localhost:5173, http://localhost:8081';
  });

  afterEach(() => {
    process.env = { ...entornoOriginal };
    jest.restoreAllMocks();
  });

  const configurar = () =>
    configurarApp(mockApp as unknown as NestExpressApplication);

  it('debe asignar el id de solicitud y la validación global estricta', () => {
    configurar();

    expect(mockApp.use).toHaveBeenCalledWith(asignarIdSolicitud);
    const [pipe] = mockApp.useGlobalPipes.mock.calls[0];
    expect(pipe).toBeInstanceOf(ValidationPipe);
    expect(pipe).toMatchObject({
      validatorOptions: { whitelist: true, forbidNonWhitelisted: true },
      isTransformEnabled: true,
    });
  });

  it('debe habilitar CORS solo para los orígenes configurados', () => {
    configurar();

    expect(mockApp.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:5173', 'http://localhost:8081'],
      exposedHeaders: [HEADER_ID_SOLICITUD, 'Retry-After'],
    });
  });

  it('debe advertir cuando CORS_ORIGINS está vacío', () => {
    process.env.CORS_ORIGINS = '';

    configurar();

    expect(Logger.warn).toHaveBeenCalledWith(
      'CORS_ORIGINS está vacío: ningún navegador podrá llamar a la API.',
      'CORS',
    );
    expect(mockApp.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: [] }),
    );
  });

  it('debe confiar en la cantidad de proxies indicada en TRUST_PROXY', () => {
    process.env.TRUST_PROXY = '1';

    configurar();

    expect(mockApp.set).toHaveBeenCalledWith('trust proxy', 1);
  });

  it.each([[undefined], ['0']])(
    'no debe confiar en proxies cuando TRUST_PROXY es %s',
    (valor) => {
      if (valor !== undefined) {
        process.env.TRUST_PROXY = valor;
      }

      configurar();

      expect(mockApp.set).not.toHaveBeenCalled();
    },
  );

  it.each([['-1'], ['uno'], ['1.5']])(
    'debe detener el arranque cuando TRUST_PROXY es %s',
    (valor) => {
      process.env.TRUST_PROXY = valor;

      expect(configurar).toThrow(
        `TRUST_PROXY inválido: "${valor}". Usa un entero >= 0.`,
      );
    },
  );
});

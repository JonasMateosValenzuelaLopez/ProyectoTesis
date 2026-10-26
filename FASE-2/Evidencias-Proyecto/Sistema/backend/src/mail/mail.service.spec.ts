import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { CorreoSaliente, enmascararCorreo, MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const mockCreateTransport = createTransport as jest.Mock;

const CORREO: CorreoSaliente = {
  para: 'ana@correo.cl',
  asunto: 'Recupera tu contraseña de EntreCasas',
  texto:
    'Abre este enlace: http://localhost:5173/restablecer-password?token=secreto',
};

describe('MailService', () => {
  let mockSendMail: jest.Mock;
  let mockVerify: jest.Mock;
  let espiaWarn: jest.SpyInstance;
  let espiaError: jest.SpyInstance;
  const nodeEnvOriginal = process.env.NODE_ENV;

  const crearTarget = (variables: Record<string, string | undefined>) =>
    new MailService({
      get: jest.fn((clave: string, porDefecto?: string) =>
        clave in variables ? variables[clave] : porDefecto,
      ),
    } as unknown as ConfigService);

  const conSmtp = {
    FRONTEND_URL: 'http://localhost:5173',
    SMTP_HOST: 'smtp.correo.cl',
  };
  const sinSmtp = { FRONTEND_URL: 'http://localhost:5173' };

  beforeEach(() => {
    mockSendMail = jest.fn().mockResolvedValue({});
    mockVerify = jest.fn().mockResolvedValue(true);
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail,
      verify: mockVerify,
    });
    espiaWarn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    espiaError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env.NODE_ENV = nodeEnvOriginal;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it.each([
      ['ausente', undefined],
      ['vacía', '   '],
    ])(
      'debe lanzar un error cuando FRONTEND_URL está %s',
      (_caso, frontendUrl) => {
        // Act & Assert
        expect(() => crearTarget({ FRONTEND_URL: frontendUrl })).toThrow(
          'FRONTEND_URL no está configurada (ver .env.example).',
        );
      },
    );

    it('no debe crear el transporte cuando falta SMTP_HOST', () => {
      // Act
      crearTarget(sinSmtp);

      // Assert
      expect(mockCreateTransport).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('debe registrar un error sin lanzar cuando el SMTP no responde', async () => {
      // Arrange
      mockVerify.mockRejectedValue(new Error('ECONNREFUSED'));
      const target = crearTarget(conSmtp);

      // Act
      await target.onModuleInit();

      // Assert
      expect(espiaError).toHaveBeenCalledWith(
        'No se pudo conectar al servidor SMTP; los correos no se enviarán.',
        expect.any(String),
      );
    });

    it('no debe verificar nada cuando no hay SMTP configurado', async () => {
      // Act
      await crearTarget(sinSmtp).onModuleInit();

      // Assert
      expect(mockVerify).not.toHaveBeenCalled();
      expect(espiaError).not.toHaveBeenCalled();
    });
  });

  describe('enmascararCorreo', () => {
    it.each([
      ['ana@correo.cl', 'a***@correo.cl'],
      ['sin-arroba', '***'],
    ])('debe convertir "%s" en "%s"', (correo, esperado) => {
      // Act & Assert
      expect(enmascararCorreo(correo)).toBe(esperado);
    });
  });

  describe('urlFrontend', () => {
    it('debe unir la ruta sin duplicar la barra final de FRONTEND_URL', () => {
      // Arrange
      const target = crearTarget({ FRONTEND_URL: 'https://panel.cl/' });

      // Act
      const resultado = target.urlFrontend('/restablecer-password?token=abc');

      // Assert
      expect(resultado).toBe('https://panel.cl/restablecer-password?token=abc');
    });
  });

  describe('enviar', () => {
    it('debe devolver true cuando el servidor SMTP acepta el correo', async () => {
      // Arrange
      const target = crearTarget(conSmtp);

      // Act
      const resultado = await target.enviar(CORREO);

      // Assert
      expect(resultado).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'EntreCasas <no-responder@entrecasas.cl>',
        to: CORREO.para,
        subject: CORREO.asunto,
        text: CORREO.texto,
      });
    });

    it('debe devolver false sin lanzar cuando el envío SMTP falla', async () => {
      // Arrange
      mockSendMail.mockRejectedValue(new Error('535 credenciales inválidas'));
      const target = crearTarget(conSmtp);

      // Act
      const resultado = await target.enviar(CORREO);

      // Assert
      expect(resultado).toBe(false);
      expect(espiaError).toHaveBeenCalledWith(
        'No se pudo enviar el correo "Recupera tu contraseña de EntreCasas" a a***@correo.cl',
        expect.any(String),
      );
    });

    it.each([
      ['production', 'production'],
      ['test', 'test'],
      ['ausente', undefined],
    ])(
      'no debe imprimir el contenido del correo sin SMTP cuando NODE_ENV es %s',
      async (_caso, nodeEnv) => {
        // Arrange
        if (nodeEnv === undefined) {
          delete process.env.NODE_ENV;
        } else {
          process.env.NODE_ENV = nodeEnv;
        }
        const target = crearTarget(sinSmtp);

        // Act
        const resultado = await target.enviar(CORREO);

        // Assert
        expect(resultado).toBe(false);
        expect(espiaWarn).not.toHaveBeenCalled();
        const registrado = espiaError.mock.calls.flat().join(' ');
        expect(registrado).toContain(CORREO.asunto);
        expect(registrado).not.toContain('token=secreto');
      },
    );

    it('debe imprimir el correo en consola sin SMTP cuando NODE_ENV es development', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const target = crearTarget(sinSmtp);

      // Act
      const resultado = await target.enviar(CORREO);

      // Assert
      expect(resultado).toBe(false);
      expect(espiaWarn).toHaveBeenCalledWith(
        expect.stringContaining('token=secreto'),
      );
    });
  });
});

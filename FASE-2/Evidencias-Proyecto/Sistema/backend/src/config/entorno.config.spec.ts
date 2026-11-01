import { Logger } from '@nestjs/common';
import { validarEntorno } from './entorno.config';

const SECRETO_LARGO = 'x'.repeat(32);

const entornoValido = {
  NODE_ENV: 'development',
  JWT_SECRET: SECRETO_LARGO,
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: 'root',
  DB_NAME: 'entrecasas_db',
  FRONTEND_URL: 'http://localhost:5173',
};

const entornoProduccion = {
  ...entornoValido,
  NODE_ENV: 'production',
  SMTP_HOST: 'smtp.correo.cl',
  MAIL_FROM: 'EntreCasas <no-responder@entrecasas.cl>',
};

describe('validarEntorno', () => {
  let espiaWarn: jest.SpyInstance;

  beforeEach(() => {
    espiaWarn = jest.spyOn(Logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe devolver el entorno cuando todo está configurado', () => {
    const resultado = validarEntorno(entornoValido);

    expect(resultado).toBe(entornoValido);
    expect(espiaWarn).not.toHaveBeenCalled();
  });

  it('debe listar todas las variables obligatorias que faltan o están vacías', () => {
    expect(() =>
      validarEntorno({ ...entornoValido, JWT_SECRET: '', DB_HOST: undefined }),
    ).toThrow(/- JWT_SECRET es obligatoria\n- DB_HOST es obligatoria/);
  });

  it.each([
    ['PORT', 'abc'],
    ['DB_PORT', '0'],
    ['SMTP_PORT', '70000'],
  ])('debe rechazar %s con valor "%s"', (clave, valor) => {
    expect(() => validarEntorno({ ...entornoValido, [clave]: valor })).toThrow(
      `${clave} debe ser un puerto válido (recibido "${valor}")`,
    );
  });

  it.each([['development'], ['test']])(
    'debe solo advertir de un JWT_SECRET corto con NODE_ENV=%s',
    (nodeEnv) => {
      validarEntorno({
        ...entornoValido,
        NODE_ENV: nodeEnv,
        JWT_SECRET: 'corto',
      });

      expect(espiaWarn).toHaveBeenCalledWith(
        'JWT_SECRET debe tener al menos 32 caracteres (obligatorio fuera de desarrollo).',
        'Entorno',
      );
    },
  );

  it.each([
    ['production', 'production'],
    ['mal escrito', 'prod'],
    ['ausente', undefined],
  ])(
    'debe ser estricto con NODE_ENV %s: rechaza secreto corto y falta de SMTP',
    (_caso, nodeEnv) => {
      expect(() =>
        validarEntorno({
          ...entornoValido,
          NODE_ENV: nodeEnv,
          JWT_SECRET: 'corto',
        }),
      ).toThrow(
        /JWT_SECRET debe tener al menos 32 caracteres\n- SMTP_HOST es obligatoria fuera de desarrollo/,
      );
    },
  );

  it('debe exigir MAIL_FROM cuando hay SMTP_HOST', () => {
    expect(() =>
      validarEntorno({ ...entornoProduccion, MAIL_FROM: '' }),
    ).toThrow(/MAIL_FROM es obligatoria si hay SMTP_HOST/);
  });

  it('debe aceptar producción con secreto largo, SMTP y remitente', () => {
    expect(() => validarEntorno(entornoProduccion)).not.toThrow();
  });
});

import { Logger } from '@nestjs/common';
import { validarEntorno } from './entorno.config';

const SECRETO_LARGO = 'x'.repeat(32);

const entornoValido = {
  JWT_SECRET: SECRETO_LARGO,
  DB_HOST: '127.0.0.1',
  DB_PORT: '3306',
  DB_USER: 'root',
  DB_NAME: 'entrecasas_db',
  FRONTEND_URL: 'http://localhost:5173',
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
    // Act
    const resultado = validarEntorno(entornoValido);

    // Assert
    expect(resultado).toBe(entornoValido);
    expect(espiaWarn).not.toHaveBeenCalled();
  });

  it('debe listar todas las variables obligatorias que faltan o están vacías', () => {
    // Act & Assert
    expect(() =>
      validarEntorno({ ...entornoValido, JWT_SECRET: '', DB_HOST: undefined }),
    ).toThrow(/- JWT_SECRET es obligatoria\n- DB_HOST es obligatoria/);
  });

  it.each([
    ['PORT', 'abc'],
    ['DB_PORT', '0'],
    ['SMTP_PORT', '70000'],
  ])('debe rechazar %s con valor "%s"', (clave, valor) => {
    // Act & Assert
    expect(() => validarEntorno({ ...entornoValido, [clave]: valor })).toThrow(
      `${clave} debe ser un puerto válido (recibido "${valor}")`,
    );
  });

  it('debe solo advertir de un JWT_SECRET corto fuera de producción', () => {
    // Act
    validarEntorno({ ...entornoValido, JWT_SECRET: 'corto' });

    // Assert
    expect(espiaWarn).toHaveBeenCalledWith(
      'JWT_SECRET debe tener al menos 32 caracteres (obligatorio en producción).',
      'Entorno',
    );
  });

  it('debe rechazar un JWT_SECRET corto y la falta de SMTP_HOST en producción', () => {
    // Act & Assert
    expect(() =>
      validarEntorno({
        ...entornoValido,
        NODE_ENV: 'production',
        JWT_SECRET: 'corto',
      }),
    ).toThrow(
      /JWT_SECRET debe tener al menos 32 caracteres\n- SMTP_HOST es obligatoria en producción/,
    );
  });

  it('debe aceptar producción con secreto largo y SMTP configurado', () => {
    // Act & Assert
    expect(() =>
      validarEntorno({
        ...entornoValido,
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.correo.cl',
      }),
    ).not.toThrow();
  });
});

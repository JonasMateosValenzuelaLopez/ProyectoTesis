import { ConfigService } from '@nestjs/config';
import { obtenerConfiguracionBaseDatos } from './database.config';

describe('obtenerConfiguracionBaseDatos', () => {
  const entorno: Record<string, string> = {
    DB_HOST: '127.0.0.1',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_NAME: 'entrecasas_db',
  };
  const configService = {
    getOrThrow: (clave: string) => entorno[clave],
    get: (_clave: string, valorPorDefecto: string) => valorPorDefecto,
  } as unknown as ConfigService;

  it('debe leer y escribir las fechas con hora en UTC', () => {
    const configuracion = obtenerConfiguracionBaseDatos(configService);

    expect(configuracion).toMatchObject({ timezone: 'Z' });
  });

  it('debe entregar las columnas DATE como texto para que la zona horaria no les reste un día', () => {
    const configuracion = obtenerConfiguracionBaseDatos(configService);

    expect(configuracion).toMatchObject({ dateStrings: ['DATE'] });
  });

  it('no debe dejar que TypeORM genere el esquema', () => {
    const configuracion = obtenerConfiguracionBaseDatos(configService);

    expect(configuracion).toMatchObject({ synchronize: false });
  });
});

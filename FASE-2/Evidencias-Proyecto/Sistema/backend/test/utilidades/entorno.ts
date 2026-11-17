import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const BD_PRUEBAS = process.env.DB_NAME_PRUEBAS ?? 'entrecasas_test';

const archivoEnv = join(__dirname, '..', '..', '.env');
if (existsSync(archivoEnv)) {
  process.loadEnvFile(archivoEnv);
}

if (BD_PRUEBAS === 'entrecasas_db') {
  throw new Error(
    'Las pruebas de integración nunca se ejecutan sobre entrecasas_db: usa otra base en DB_NAME_PRUEBAS',
  );
}

process.env.DB_NAME = BD_PRUEBAS;
process.env.NODE_ENV = 'test';
process.env.SMTP_HOST = '';
process.env.TRUST_PROXY = '1';
process.env.DB_HOST ??= '127.0.0.1';
process.env.DB_PORT ??= '3306';
process.env.DB_USER ??= 'root';
process.env.JWT_SECRET ??= 'secreto-de-pruebas-de-integracion-entrecasas';
process.env.FRONTEND_URL ??= 'http://localhost:5173';

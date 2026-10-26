import { Logger } from '@nestjs/common';

const OBLIGATORIAS = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_NAME',
  'FRONTEND_URL',
] as const;
const PUERTOS = ['PORT', 'DB_PORT', 'SMTP_PORT'] as const;
const LARGO_MINIMO_JWT_SECRET = 32;

/**
 * Valida las variables de entorno al arrancar (ConfigModule.forRoot). Un
 * valor faltante o mal escrito detiene la app con un mensaje claro, en vez de
 * fallar más tarde en un lugar difícil de relacionar.
 */
export function validarEntorno(
  entorno: Record<string, unknown>,
): Record<string, unknown> {
  const texto = (clave: string) => String(entorno[clave] ?? '').trim();
  const errores: string[] = [];

  for (const clave of OBLIGATORIAS) {
    if (!texto(clave)) {
      errores.push(`${clave} es obligatoria`);
    }
  }
  for (const clave of PUERTOS) {
    const valor = texto(clave);
    const puerto = Number(valor);
    if (valor && (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535)) {
      errores.push(`${clave} debe ser un puerto válido (recibido "${valor}")`);
    }
  }

  const produccion = texto('NODE_ENV') === 'production';
  const largoSecreto = texto('JWT_SECRET').length;
  if (largoSecreto > 0 && largoSecreto < LARGO_MINIMO_JWT_SECRET) {
    const mensaje = `JWT_SECRET debe tener al menos ${LARGO_MINIMO_JWT_SECRET} caracteres`;
    if (produccion) {
      errores.push(mensaje);
    } else {
      Logger.warn(`${mensaje} (obligatorio en producción).`, 'Entorno');
    }
  }
  // En producción, sin SMTP ningún correo de activación o recuperación sale.
  if (produccion && !texto('SMTP_HOST')) {
    errores.push('SMTP_HOST es obligatoria en producción');
  }

  if (errores.length > 0) {
    throw new Error(
      `Configuración inválida (ver .env.example):\n- ${errores.join('\n- ')}`,
    );
  }
  return entorno;
}

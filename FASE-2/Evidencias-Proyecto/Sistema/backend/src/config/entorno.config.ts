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
const ENTORNOS_LOCALES = ['development', 'test'];

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

  const estricto = !ENTORNOS_LOCALES.includes(texto('NODE_ENV'));
  const largoSecreto = texto('JWT_SECRET').length;
  if (largoSecreto > 0 && largoSecreto < LARGO_MINIMO_JWT_SECRET) {
    const mensaje = `JWT_SECRET debe tener al menos ${LARGO_MINIMO_JWT_SECRET} caracteres`;
    if (estricto) {
      errores.push(mensaje);
    } else {
      Logger.warn(`${mensaje} (obligatorio fuera de desarrollo).`, 'Entorno');
    }
  }
  if (estricto && !texto('SMTP_HOST')) {
    errores.push('SMTP_HOST es obligatoria fuera de desarrollo');
  }
  if (texto('SMTP_HOST') && !texto('MAIL_FROM')) {
    errores.push(
      'MAIL_FROM es obligatoria si hay SMTP_HOST (debe ser un remitente verificado en el proveedor)',
    );
  }

  if (errores.length > 0) {
    throw new Error(
      `Configuración inválida (ver .env.example):\n- ${errores.join('\n- ')}`,
    );
  }
  return entorno;
}

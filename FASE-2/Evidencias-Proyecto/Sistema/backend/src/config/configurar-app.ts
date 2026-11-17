import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  asignarIdSolicitud,
  HEADER_ID_SOLICITUD,
} from '../common/errores/id-solicitud.middleware';
import { errorDeValidacion } from '../common/utils/validacion';

export function configurarApp(app: NestExpressApplication) {
  app.use(asignarIdSolicitud);

  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy) {
    const proxies = Number(trustProxy);
    if (!Number.isInteger(proxies) || proxies < 0) {
      throw new Error(
        `TRUST_PROXY inválido: "${trustProxy}". Usa un entero >= 0.`,
      );
    }
    if (proxies > 0) {
      app.set('trust proxy', proxies);
    }
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: errorDeValidacion,
    }),
  );

  const origenesPermitidos = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  if (origenesPermitidos.length === 0) {
    Logger.warn(
      'CORS_ORIGINS está vacío: ningún navegador podrá llamar a la API.',
      'CORS',
    );
  }
  app.enableCors({
    origin: origenesPermitidos,
    exposedHeaders: [HEADER_ID_SOLICITUD, 'Retry-After'],
  });
}

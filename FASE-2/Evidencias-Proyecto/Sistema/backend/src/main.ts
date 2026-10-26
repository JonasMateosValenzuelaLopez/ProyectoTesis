import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás de un proxy (Render, Vercel) hay que confiar en X-Forwarded-For
  // para que el límite de intentos se aplique por IP real del cliente.
  // No activarlo sin proxy: permitiría falsificar la IP.
  // TRUST_PROXY = número de proxies delante de la API (0 o vacío = ninguno).
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
    }),
  );

  // CORS_ORIGINS: lista separada por comas (ej: http://localhost:5173).
  // La app móvil nativa no envía Origin, así que no se ve afectada.
  // Sin la variable no se permite ningún origen de navegador.
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
  app.enableCors({ origin: origenesPermitidos });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap().catch((error: unknown) => {
  Logger.error(
    error instanceof Error ? error.message : String(error),
    error instanceof Error ? error.stack : undefined,
    'Arranque',
  );
  process.exit(1);
});

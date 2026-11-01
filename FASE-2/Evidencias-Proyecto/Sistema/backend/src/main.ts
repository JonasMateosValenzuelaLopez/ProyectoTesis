import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

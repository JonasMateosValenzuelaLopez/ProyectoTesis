import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configurarApp } from './config/configurar-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configurarApp(app);
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

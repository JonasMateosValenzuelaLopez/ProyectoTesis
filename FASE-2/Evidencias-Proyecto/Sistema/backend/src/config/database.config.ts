import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const obtenerConfiguracionBaseDatos = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mariadb',
  host: configService.getOrThrow<string>('DB_HOST'),
  port: Number(configService.getOrThrow<string>('DB_PORT')),
  username: configService.getOrThrow<string>('DB_USER'),
  password: configService.get<string>('DB_PASSWORD', ''),
  database: configService.getOrThrow<string>('DB_NAME'),
  charset: 'utf8mb4_unicode_ci',
  autoLoadEntities: true,
  synchronize: false,
});

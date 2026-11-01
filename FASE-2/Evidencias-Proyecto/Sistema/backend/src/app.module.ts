import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { BitacoraModule } from './bitacora/bitacora.module';
import { ErroresBdFilter } from './common/filters/errores-bd.filter';
import { obtenerConfiguracionBaseDatos } from './config/database.config';
import { validarEntorno } from './config/entorno.config';
import { MailModule } from './mail/mail.module';
import { RedesVecinalesModule } from './redes-vecinales/redes-vecinales.module';
import { RolesModule } from './roles/roles.module';
import { SolicitudesAccesoModule } from './solicitudes-acceso/solicitudes-acceso.module';
import { UnidadesModule } from './unidades/unidades.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: obtenerConfiguracionBaseDatos,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'rafaga', ttl: 1_000, limit: 20 },
        { name: 'default', ttl: 60_000, limit: 120 },
      ],
      errorMessage:
        'Demasiadas solicitudes. Espera un momento e intenta de nuevo.',
    }),
    MailModule,
    BitacoraModule,
    AuthModule,
    RedesVecinalesModule,
    RolesModule,
    SolicitudesAccesoModule,
    UnidadesModule,
    UsuariosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: ErroresBdFilter },
  ],
})
export class AppModule {}

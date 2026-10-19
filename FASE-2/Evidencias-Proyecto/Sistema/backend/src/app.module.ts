import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { obtenerConfiguracionBaseDatos } from './config/database.config';
import { RedesVecinalesModule } from './redes-vecinales/redes-vecinales.module';
import { RolesModule } from './roles/roles.module';
import { UnidadesModule } from './unidades/unidades.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: obtenerConfiguracionBaseDatos,
    }),
    RedesVecinalesModule,
    RolesModule,
    UnidadesModule,
    UsuariosModule,
  ],
})
export class AppModule {}

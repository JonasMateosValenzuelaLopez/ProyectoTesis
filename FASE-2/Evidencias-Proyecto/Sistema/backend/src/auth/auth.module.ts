import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { StringValue } from 'ms';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CambioCorreo } from './entities/cambio-correo.entity';
import { CodigoOtp } from './entities/codigo-otp.entity';
import { TokenPassword } from './entities/token-password.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PlataformaGuard } from './guards/plataforma.guard';
import { RolesGuard } from './guards/roles.guard';
import { MisDatosController } from './mis-datos.controller';
import { MisDatosService } from './mis-datos.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TareaCambiosCorreo } from './tarea-cambios-correo.service';

@Global()
@Module({
  imports: [
    UsuariosModule,
    TypeOrmModule.forFeature([TokenPassword, CodigoOtp, CambioCorreo]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<StringValue>('JWT_EXPIRES_IN', '1h'),
        },
      }),
    }),
  ],
  controllers: [AuthController, MisDatosController],
  providers: [
    AuthService,
    MisDatosService,
    TareaCambiosCorreo,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PlataformaGuard,
  ],
  exports: [
    UsuariosModule,
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    PlataformaGuard,
  ],
})
export class AuthModule {}

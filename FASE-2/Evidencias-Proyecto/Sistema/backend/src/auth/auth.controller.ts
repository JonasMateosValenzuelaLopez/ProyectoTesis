import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { UsuarioAutenticado } from '../common/interfaces/jwt-payload.interface';
import { AuthService } from './auth.service';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import { IdentificadorUsuarioDto } from './dto/identificador-usuario.dto';
import { LoginDto } from './dto/login.dto';
import { RestablecerPasswordDto } from './dto/restablecer-password.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('codigo')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  solicitarCodigo(@Body() dto: IdentificadorUsuarioDto) {
    return this.authService.solicitarCodigo(dto);
  }

  @Post('codigo/verificar')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  verificarCodigo(@Body() dto: VerificarCodigoDto) {
    return this.authService.verificarCodigo(dto);
  }

  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.authService.perfil(usuario.idUsuario);
  }

  @Post('recuperar-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  recuperarPassword(@Body() dto: IdentificadorUsuarioDto) {
    return this.authService.solicitarRecuperacion(dto);
  }

  @Post('restablecer-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  restablecerPassword(@Body() dto: RestablecerPasswordDto) {
    return this.authService.restablecerPassword(dto);
  }
}

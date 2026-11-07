import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { UsuarioAutenticado } from '../common/interfaces/jwt-payload.interface';
import { UsuarioActual } from './decorators/usuario-actual.decorator';
import {
  ActualizarTelefonoDto,
  CambiarPasswordDto,
  ConfirmarCambioCorreoDto,
  SolicitarCambioCorreoDto,
} from './dto/mis-datos.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MisDatosService } from './mis-datos.service';

@Controller('auth/perfil')
@UseGuards(JwtAuthGuard)
export class MisDatosController {
  constructor(private readonly misDatosService: MisDatosService) {}

  @Put('telefono')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  actualizarTelefono(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ActualizarTelefonoDto,
  ) {
    return this.misDatosService.actualizarTelefono(usuario.idUsuario, dto);
  }

  @Post('correo')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  solicitarCambioCorreo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: SolicitarCambioCorreoDto,
  ) {
    return this.misDatosService.solicitarCambioCorreo(usuario.idUsuario, dto);
  }

  @Post('correo/confirmacion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  confirmarCambioCorreo(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ConfirmarCambioCorreoDto,
  ) {
    return this.misDatosService.confirmarCambioCorreo(usuario.idUsuario, dto);
  }

  @Put('password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  cambiarPassword(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.misDatosService.cambiarPassword(usuario.idUsuario, dto);
  }
}

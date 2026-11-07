import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import {
  DatosComunidadService,
  LECTORES_DATOS_COMUNIDAD,
} from './datos-comunidad.service';
import {
  CambiarUmbralVisadoDto,
  GuardarDatosComunidadDto,
} from './dto/datos-comunidad.dto';

const LIMITE_ESCRITURA = { default: { limit: 20, ttl: 60_000 } };

@Controller('comunidad')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DatosComunidadController {
  constructor(private readonly datosComunidadService: DatosComunidadService) {}

  @Get('datos')
  @Roles(...LECTORES_DATOS_COMUNIDAD)
  obtener(@RedActual() red: ContextoRed) {
    return this.datosComunidadService.obtener(red);
  }

  @Put('datos')
  @Roles(RolUsuario.ADMINISTRADOR)
  @Throttle(LIMITE_ESCRITURA)
  guardar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarDatosComunidadDto,
  ) {
    return this.datosComunidadService.guardar(red, usuario.idUsuario, dto);
  }

  @Put('umbral-visado')
  @Roles(RolUsuario.PRESIDENTE)
  @Throttle(LIMITE_ESCRITURA)
  cambiarUmbralVisado(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CambiarUmbralVisadoDto,
  ) {
    return this.datosComunidadService.cambiarUmbralVisado(
      red,
      usuario.idUsuario,
      dto,
    );
  }
}

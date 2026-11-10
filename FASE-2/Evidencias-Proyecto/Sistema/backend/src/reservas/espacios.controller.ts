import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { GuardarEspaciosDto } from './dto/reservas.dto';
import { EspaciosService } from './espacios.service';
import { GESTION_RESERVAS } from './reglas-reservas';

@Controller('reservas/espacios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EspaciosController {
  constructor(private readonly espaciosService: EspaciosService) {}

  @Get()
  listar(@RedActual() red: ContextoRed) {
    return this.espaciosService.listar(red);
  }

  @Put()
  @Roles(...GESTION_RESERVAS)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  guardar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarEspaciosDto,
  ) {
    return this.espaciosService.guardar(red, usuario.idUsuario, dto);
  }
}

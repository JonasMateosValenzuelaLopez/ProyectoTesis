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
import { GuardarGuiaDto } from './dto/guardar-guia.dto';
import { GuiaService } from './guia.service';

@Controller('comunidad/guia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuiaController {
  constructor(private readonly guiaService: GuiaService) {}

  @Get()
  obtener(@RedActual() red: ContextoRed) {
    return this.guiaService.obtener(red);
  }

  @Put()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.SECRETARIO)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  guardar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarGuiaDto,
  ) {
    return this.guiaService.guardar(red, usuario.idUsuario, dto);
  }
}

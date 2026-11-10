import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { RequiereModulo } from '../auth/decorators/requiere-modulo.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CrearRetencionDto } from './dto/accesos.dto';
import { RetencionAccesosService } from './retencion-accesos.service';

@Controller('porteria/retenciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.CONSERJERIA)
@Roles(RolUsuario.ADMINISTRADOR)
export class RetencionesController {
  constructor(private readonly retencionService: RetencionAccesosService) {}

  @Get()
  listar(@RedActual() red: ContextoRed) {
    return this.retencionService.listar(red);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crear(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearRetencionDto,
  ) {
    return this.retencionService.crear(red, usuario.idUsuario, dto);
  }

  @Post(':idRetencion/liberacion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  liberar(
    @Param('idRetencion', ParseIdPipe) idRetencion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.retencionService.liberar(red, usuario.idUsuario, idRetencion);
  }
}

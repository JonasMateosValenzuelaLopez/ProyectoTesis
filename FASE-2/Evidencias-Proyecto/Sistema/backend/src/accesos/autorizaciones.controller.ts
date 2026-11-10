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
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { AutorizacionesService } from './autorizaciones.service';
import { DecisionAccesoDto } from './dto/accesos.dto';

@Controller('accesos')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.CONSERJERIA)
export class AutorizacionesController {
  constructor(private readonly autorizacionesService: AutorizacionesService) {}

  @Get('por-autorizar')
  pendientes(@RedActual() red: ContextoRed) {
    return this.autorizacionesService.pendientes(red);
  }

  @Post(':idAcceso/respuesta')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  responder(
    @Param('idAcceso', ParseIdPipe) idAcceso: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DecisionAccesoDto,
  ) {
    return this.autorizacionesService.responder(
      red,
      usuario.idUsuario,
      idAcceso,
      dto,
    );
  }
}

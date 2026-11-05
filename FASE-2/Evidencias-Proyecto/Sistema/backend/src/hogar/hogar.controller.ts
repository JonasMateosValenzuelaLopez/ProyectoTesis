import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { GuardarFichaDto } from './dto/guardar-ficha.dto';
import { HogarService } from './hogar.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class HogarController {
  constructor(private readonly hogarService: HogarService) {}

  @Get('unidades/:idUnidad/fichas')
  listar(
    @Param('idUnidad', ParseIntPipe) idUnidad: number,
    @RedActual() red: ContextoRed,
  ) {
    return this.hogarService.listar(idUnidad, red);
  }

  @Post('unidades/:idUnidad/fichas')
  @Throttle(LIMITE_ESCRITURA)
  crear(
    @Param('idUnidad', ParseIntPipe) idUnidad: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarFichaDto,
  ) {
    return this.hogarService.crear(idUnidad, red, usuario.idUsuario, dto);
  }

  @Put('fichas/:idFicha')
  @Throttle(LIMITE_ESCRITURA)
  actualizar(
    @Param('idFicha', ParseIntPipe) idFicha: number,
    @RedActual() red: ContextoRed,
    @Body() dto: GuardarFichaDto,
  ) {
    return this.hogarService.actualizar(idFicha, red, dto);
  }

  @Post('fichas/:idFicha/mantencion')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  registrarMantencion(
    @Param('idFicha', ParseIntPipe) idFicha: number,
    @RedActual() red: ContextoRed,
  ) {
    return this.hogarService.registrarMantencion(idFicha, red);
  }

  @Delete('fichas/:idFicha')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  eliminar(
    @Param('idFicha', ParseIntPipe) idFicha: number,
    @RedActual() red: ContextoRed,
  ) {
    return this.hogarService.eliminar(idFicha, red);
  }
}

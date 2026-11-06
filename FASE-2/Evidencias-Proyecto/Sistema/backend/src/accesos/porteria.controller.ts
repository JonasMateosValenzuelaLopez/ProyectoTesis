import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
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
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { PaginaMuroDto } from '../muro/dto/muro.dto';
import {
  BusquedaPorteriaDto,
  CodigoInvitacionDto,
  DecisionAccesoDto,
  IngresoSinInvitacionDto,
} from './dto/accesos.dto';
import { PorteriaService } from './porteria.service';
import { GARITA } from './reglas-accesos';

const LIMITE_GARITA = { default: { limit: 60, ttl: 60_000 } };

@Controller('porteria')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.CONSERJERIA)
@Roles(...GARITA)
export class PorteriaController {
  constructor(private readonly porteriaService: PorteriaService) {}

  @Get('resumen')
  resumen(@RedActual() red: ContextoRed) {
    return this.porteriaService.resumen(red);
  }

  @Get('accesos')
  monitor(@RedActual() red: ContextoRed, @Query() filtro: PaginaMuroDto) {
    return this.porteriaService.monitor(red, filtro);
  }

  @Get('busqueda')
  buscar(@RedActual() red: ContextoRed, @Query() filtro: BusquedaPorteriaDto) {
    return this.porteriaService.buscar(red, filtro.q);
  }

  @Post('validacion')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_GARITA)
  validar(@RedActual() red: ContextoRed, @Body() dto: CodigoInvitacionDto) {
    return this.porteriaService.validar(red, dto);
  }

  @Post('ingresos')
  @Throttle(LIMITE_GARITA)
  ingresoConCodigo(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CodigoInvitacionDto,
  ) {
    return this.porteriaService.ingresoConCodigo(red, usuario.idUsuario, dto);
  }

  @Post('invitaciones/:idInvitacion/ingreso')
  @Throttle(LIMITE_GARITA)
  ingresoPorInvitacion(
    @Param('idInvitacion', ParseIdPipe) idInvitacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.porteriaService.ingresoPorInvitacion(
      red,
      usuario.idUsuario,
      idInvitacion,
    );
  }

  @Post('accesos')
  @Throttle(LIMITE_GARITA)
  ingresoSinInvitacion(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: IngresoSinInvitacionDto,
  ) {
    return this.porteriaService.ingresoSinInvitacion(
      red,
      usuario.idUsuario,
      dto,
    );
  }

  @Post('accesos/:idAcceso/salida')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_GARITA)
  registrarSalida(
    @Param('idAcceso', ParseIdPipe) idAcceso: number,
    @RedActual() red: ContextoRed,
  ) {
    return this.porteriaService.registrarSalida(red, idAcceso);
  }

  @Post('accesos/:idAcceso/autorizacion')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_GARITA)
  resolverPorTelefono(
    @Param('idAcceso', ParseIdPipe) idAcceso: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DecisionAccesoDto,
  ) {
    return this.porteriaService.resolverPorTelefono(
      red,
      usuario.idUsuario,
      idAcceso,
      dto,
    );
  }
}

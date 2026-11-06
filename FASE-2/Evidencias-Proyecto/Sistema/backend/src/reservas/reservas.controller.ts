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
import {
  CancelarReservaDto,
  CrearReservaDto,
  DisponibilidadDto,
  ListarReservasDto,
  RecibirEspacioDto,
} from './dto/reservas.dto';
import { CONSERJERIA_RESERVAS, GESTION_RESERVAS } from './reglas-reservas';
import { ReservasService } from './reservas.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('reservas')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.RESERVAS)
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Get('disponibilidad')
  disponibilidad(
    @RedActual() red: ContextoRed,
    @Query() filtro: DisponibilidadDto,
  ) {
    return this.reservasService.disponibilidad(red, filtro);
  }

  @Get('mias')
  mias(@RedActual() red: ContextoRed) {
    return this.reservasService.mias(red);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crear(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearReservaDto,
  ) {
    return this.reservasService.crear(red, usuario.idUsuario, dto);
  }

  @Post(':idReserva/cancelacion')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  cancelarPropia(
    @Param('idReserva', ParseIdPipe) idReserva: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.reservasService.cancelarPropia(
      red,
      usuario.idUsuario,
      idReserva,
    );
  }

  @Get()
  @Roles(...GESTION_RESERVAS)
  listar(@RedActual() red: ContextoRed, @Query() filtro: ListarReservasDto) {
    return this.reservasService.listar(red, filtro);
  }

  @Post(':idReserva/cancelacion-administrativa')
  @Roles(...GESTION_RESERVAS)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  cancelarPorAdministracion(
    @Param('idReserva', ParseIdPipe) idReserva: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CancelarReservaDto,
  ) {
    return this.reservasService.cancelarPorAdministracion(
      red,
      usuario.idUsuario,
      idReserva,
      dto,
    );
  }

  @Get('hoy')
  @Roles(...CONSERJERIA_RESERVAS)
  delDia(@RedActual() red: ContextoRed) {
    return this.reservasService.delDia(red);
  }

  @Post(':idReserva/entrega')
  @Roles(...CONSERJERIA_RESERVAS)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  entregar(
    @Param('idReserva', ParseIdPipe) idReserva: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.reservasService.entregar(red, usuario.idUsuario, idReserva);
  }

  @Post(':idReserva/recepcion')
  @Roles(...CONSERJERIA_RESERVAS)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  recibir(
    @Param('idReserva', ParseIdPipe) idReserva: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RecibirEspacioDto,
  ) {
    return this.reservasService.recibir(red, usuario.idUsuario, idReserva, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { CrearSolicitudAccesoDto } from './dto/crear-solicitud-acceso.dto';
import {
  AprobarSolicitudAccesoDto,
  ListarSolicitudesAccesoDto,
  RechazarSolicitudAccesoDto,
} from './dto/resolver-solicitud-acceso.dto';
import { SolicitudesAccesoService } from './solicitudes-acceso.service';

@Controller('solicitudes-acceso')
export class SolicitudesAccesoController {
  constructor(private readonly solicitudesService: SolicitudesAccesoService) {}

  // Público: selector de comunidad del formulario "Solicita acceso".
  @Get('comunidades')
  listarComunidades() {
    return this.solicitudesService.listarComunidades();
  }

  // Público: botón "Enviar Solicitud".
  @Post()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  crear(@Body() dto: CrearSolicitudAccesoDto) {
    return this.solicitudesService.crear(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRACION)
  listar(
    @RedActual() red: ContextoRed,
    @Query() filtro: ListarSolicitudesAccesoDto,
  ) {
    return this.solicitudesService.listar(red, filtro.estado);
  }

  @Patch(':id/aprobar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRACION)
  aprobar(
    @Param('id', ParseIntPipe) id: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: AprobarSolicitudAccesoDto,
  ) {
    return this.solicitudesService.aprobar(id, red, usuario.idUsuario, dto);
  }

  @Patch(':id/rechazar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRACION)
  rechazar(
    @Param('id', ParseIntPipe) id: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RechazarSolicitudAccesoDto,
  ) {
    return this.solicitudesService.rechazar(id, red, usuario.idUsuario, dto);
  }
}

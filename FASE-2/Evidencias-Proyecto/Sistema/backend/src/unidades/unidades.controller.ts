import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
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
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import {
  CambiarTitularDto,
  CrearLoteUnidadesDto,
  EditarUnidadDto,
} from './dto/unidades.dto';
import { UnidadesService } from './unidades.service';

export const LECTORES_UNIDADES = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.PRESIDENTE,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
  RolUsuario.CONSERJE,
];

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('unidades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Get()
  @Roles(...LECTORES_UNIDADES)
  listar(@RedActual() red: ContextoRed) {
    return this.unidadesService.listar(red);
  }

  @Post('lote')
  @Roles(RolUsuario.ADMINISTRADOR)
  @Throttle(LIMITE_ESCRITURA)
  crearLote(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearLoteUnidadesDto,
  ) {
    return this.unidadesService.crearLote(red, usuario.idUsuario, dto);
  }

  @Patch(':idUnidad')
  @Roles(RolUsuario.ADMINISTRADOR)
  @Throttle(LIMITE_ESCRITURA)
  editar(
    @Param('idUnidad', ParseIdPipe) idUnidad: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: EditarUnidadDto,
  ) {
    return this.unidadesService.editar(red, usuario.idUsuario, idUnidad, dto);
  }

  @Put(':idUnidad/titular')
  @Roles(RolUsuario.ADMINISTRADOR)
  @Throttle(LIMITE_ESCRITURA)
  cambiarTitular(
    @Param('idUnidad', ParseIdPipe) idUnidad: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CambiarTitularDto,
  ) {
    return this.unidadesService.cambiarTitular(
      red,
      usuario.idUsuario,
      idUnidad,
      dto,
    );
  }
}

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
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CrearVotacionDto, VotarDto } from './dto/votaciones.dto';
import { DIRECTIVA_VOTACIONES } from './reglas-votaciones';
import { VotacionesService } from './votaciones.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('votaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.VOTACIONES)
export class VotacionesController {
  constructor(private readonly votacionesService: VotacionesService) {}

  @Get()
  listar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.votacionesService.listar(red, usuario.idUsuario);
  }

  @Post()
  @Roles(...DIRECTIVA_VOTACIONES)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crear(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearVotacionDto,
  ) {
    return this.votacionesService.crear(red, usuario.idUsuario, dto);
  }

  @Post(':idVotacion/cierre')
  @Roles(...DIRECTIVA_VOTACIONES)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  cerrar(
    @Param('idVotacion', ParseIdPipe) idVotacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.votacionesService.cerrar(red, usuario.idUsuario, idVotacion);
  }

  @Post(':idVotacion/recordatorio')
  @Roles(...DIRECTIVA_VOTACIONES)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  recordar(
    @Param('idVotacion', ParseIdPipe) idVotacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.votacionesService.recordar(red, usuario.idUsuario, idVotacion);
  }

  @Post(':idVotacion/votos')
  @Throttle(LIMITE_ESCRITURA)
  votar(
    @Param('idVotacion', ParseIdPipe) idVotacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: VotarDto,
  ) {
    return this.votacionesService.votar(
      red,
      usuario.idUsuario,
      idVotacion,
      dto,
    );
  }
}

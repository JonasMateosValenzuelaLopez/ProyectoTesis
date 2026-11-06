import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { ActasService } from './actas.service';
import { GuardarActaDto } from './dto/votaciones.dto';
import { DIRECTIVA_VOTACIONES } from './reglas-votaciones';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('actas')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.VOTACIONES)
export class ActasController {
  constructor(private readonly actasService: ActasService) {}

  @Get()
  listar(@RedActual() red: ContextoRed) {
    return this.actasService.listar(red);
  }

  @Post()
  @Roles(...DIRECTIVA_VOTACIONES)
  @Throttle(LIMITE_ESCRITURA)
  crear(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarActaDto,
  ) {
    return this.actasService.crear(red, usuario.idUsuario, dto);
  }

  @Put(':idActa')
  @Roles(...DIRECTIVA_VOTACIONES)
  @Throttle(LIMITE_ESCRITURA)
  editar(
    @Param('idActa', ParseIdPipe) idActa: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarActaDto,
  ) {
    return this.actasService.editar(red, usuario.idUsuario, idActa, dto);
  }

  @Post(':idActa/publicacion')
  @Roles(...DIRECTIVA_VOTACIONES)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  publicar(
    @Param('idActa', ParseIdPipe) idActa: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.actasService.publicar(red, usuario.idUsuario, idActa);
  }

  @Delete(':idActa')
  @Roles(...DIRECTIVA_VOTACIONES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  eliminar(
    @Param('idActa', ParseIdPipe) idActa: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.actasService.eliminar(red, usuario.idUsuario, idActa);
  }
}

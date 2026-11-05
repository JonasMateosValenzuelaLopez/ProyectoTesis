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
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlataformaGuard } from '../auth/guards/plataforma.guard';
import type { UsuarioAutenticado } from '../common/interfaces/jwt-payload.interface';
import { SuspenderComunidadDto } from './dto/suspender-comunidad.dto';
import { PlataformaService } from './plataforma.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('plataforma/comunidades')
@UseGuards(JwtAuthGuard, PlataformaGuard)
export class PlataformaController {
  constructor(private readonly plataformaService: PlataformaService) {}

  @Get()
  listar() {
    return this.plataformaService.listar();
  }

  @Get(':idRed')
  ficha(
    @Param('idRed', ParseIntPipe) idRed: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.plataformaService.ficha(idRed, usuario.idUsuario);
  }

  @Post(':idRed/suspension')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  suspender(
    @Param('idRed', ParseIntPipe) idRed: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: SuspenderComunidadDto,
  ) {
    return this.plataformaService.suspender(
      idRed,
      usuario.idUsuario,
      dto.motivo,
    );
  }

  @Delete(':idRed/suspension')
  @Throttle(LIMITE_ESCRITURA)
  reactivar(
    @Param('idRed', ParseIntPipe) idRed: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.plataformaService.reactivar(idRed, usuario.idUsuario);
  }
}

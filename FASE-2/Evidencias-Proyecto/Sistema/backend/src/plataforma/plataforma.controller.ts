import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlataformaGuard } from '../auth/guards/plataforma.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import type { UsuarioAutenticado } from '../common/interfaces/jwt-payload.interface';
import { CambiarModuloDto, CambiarTipoDto } from './dto/cambiar-comunidad.dto';
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

  @Put(':idRed/modulos/:codigoModulo')
  @Throttle(LIMITE_ESCRITURA)
  cambiarModulo(
    @Param('idRed', ParseIntPipe) idRed: number,
    @Param(
      'codigoModulo',
      new ParseEnumPipe(CodigoModulo, {
        exceptionFactory: () => new BadRequestException('El módulo no existe'),
      }),
    )
    codigoModulo: CodigoModulo,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CambiarModuloDto,
  ) {
    return this.plataformaService.cambiarModulo(
      idRed,
      usuario.idUsuario,
      codigoModulo,
      dto.activo,
    );
  }

  @Put(':idRed/tipo')
  @Throttle(LIMITE_ESCRITURA)
  cambiarTipo(
    @Param('idRed', ParseIntPipe) idRed: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CambiarTipoDto,
  ) {
    return this.plataformaService.cambiarTipo(
      idRed,
      usuario.idUsuario,
      dto.tipo,
    );
  }
}

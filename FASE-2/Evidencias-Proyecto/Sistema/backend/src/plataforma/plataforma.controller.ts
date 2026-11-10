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
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { AltaComunidadService } from './alta-comunidad.service';
import { CambiarModuloDto, CambiarTipoDto } from './dto/cambiar-comunidad.dto';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';
import { SuspenderComunidadDto } from './dto/suspender-comunidad.dto';
import { PlataformaService } from './plataforma.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('plataforma/comunidades')
@UseGuards(JwtAuthGuard, PlataformaGuard)
export class PlataformaController {
  constructor(
    private readonly plataformaService: PlataformaService,
    private readonly altaComunidadService: AltaComunidadService,
  ) {}

  @Get()
  listar() {
    return this.plataformaService.listar();
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crear(
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearComunidadDto,
  ) {
    return this.altaComunidadService.crear(usuario.idUsuario, dto);
  }

  @Get(':idRed')
  ficha(
    @Param('idRed', ParseIdPipe) idRed: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.plataformaService.ficha(idRed, usuario.idUsuario);
  }

  @Post(':idRed/suspension')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  suspender(
    @Param('idRed', ParseIdPipe) idRed: number,
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
    @Param('idRed', ParseIdPipe) idRed: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.plataformaService.reactivar(idRed, usuario.idUsuario);
  }

  @Put(':idRed/modulos/:codigoModulo')
  @Throttle(LIMITE_ESCRITURA)
  cambiarModulo(
    @Param('idRed', ParseIdPipe) idRed: number,
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
    @Param('idRed', ParseIdPipe) idRed: number,
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

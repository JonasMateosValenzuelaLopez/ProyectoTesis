import {
  Body,
  Controller,
  Delete,
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
import { DecidirDto } from '../common/dto/decidir.dto';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import {
  PaginaMuroDto,
  PublicarOficialDto,
  PublicarVecinoDto,
  ReportarPublicacionDto,
} from './dto/muro.dto';
import { ModeracionService } from './moderacion.service';
import { MuroService } from './muro.service';
import { OficialesService } from './oficiales.service';
import { DIRECTIVA_MURO } from './presentacion-muro';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('muro')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.MURO)
export class MuroController {
  constructor(
    private readonly muroService: MuroService,
    private readonly oficialesService: OficialesService,
    private readonly moderacionService: ModeracionService,
  ) {}

  @Get()
  listar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() filtro: PaginaMuroDto,
  ) {
    return this.muroService.listar(red, usuario.idUsuario, filtro);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  publicar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: PublicarVecinoDto,
  ) {
    return this.muroService.publicar(red, usuario.idUsuario, dto);
  }

  @Delete(':idPublicacion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  eliminar(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.muroService.eliminarPropia(
      red,
      usuario.idUsuario,
      idPublicacion,
    );
  }

  @Post(':idPublicacion/reportes')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reportar(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ReportarPublicacionDto,
  ) {
    return this.muroService.reportar(
      red,
      usuario.idUsuario,
      idPublicacion,
      dto,
    );
  }

  @Get('oficiales')
  @Roles(...DIRECTIVA_MURO)
  listarOficiales(@RedActual() red: ContextoRed) {
    return this.oficialesService.listar(red);
  }

  @Post('oficiales')
  @Roles(...DIRECTIVA_MURO)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  publicarOficial(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: PublicarOficialDto,
  ) {
    return this.oficialesService.publicar(red, usuario.idUsuario, dto);
  }

  @Post('oficiales/:idPublicacion/decision')
  @Roles(RolUsuario.PRESIDENTE)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  decidirOficial(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DecidirDto,
  ) {
    return this.oficialesService.decidir(
      red,
      usuario.idUsuario,
      idPublicacion,
      dto,
    );
  }

  @Delete('oficiales/:idPublicacion')
  @Roles(...DIRECTIVA_MURO)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  eliminarOficial(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.oficialesService.eliminar(
      red,
      usuario.idUsuario,
      idPublicacion,
    );
  }

  @Get('moderacion')
  @Roles(RolUsuario.ADMINISTRADOR)
  listarModeracion(
    @RedActual() red: ContextoRed,
    @Query() filtro: PaginaMuroDto,
  ) {
    return this.moderacionService.listar(red, filtro);
  }

  @Post(':idPublicacion/ocultar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  ocultar(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.moderacionService.ocultar(
      red,
      usuario.idUsuario,
      idPublicacion,
    );
  }

  @Post(':idPublicacion/restaurar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  restaurar(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.moderacionService.restaurar(
      red,
      usuario.idUsuario,
      idPublicacion,
    );
  }

  @Post(':idPublicacion/reportes/descarte')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  descartarReportes(
    @Param('idPublicacion', ParseIdPipe) idPublicacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.moderacionService.descartarReportes(
      red,
      usuario.idUsuario,
      idPublicacion,
    );
  }
}

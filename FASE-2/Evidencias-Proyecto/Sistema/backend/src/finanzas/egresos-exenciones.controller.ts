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
import { DecidirDto } from '../common/dto/decidir.dto';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import {
  RegistrarEgresoDto,
  ReporteDto,
  SolicitarExencionDto,
} from './dto/egresos-exenciones.dto';
import { EgresosService } from './egresos.service';
import { ExencionesService } from './exenciones.service';
import { GESTION_COBROS, LECTURA_FINANZAS } from './reglas-finanzas';
import { ReportesService } from './reportes.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('finanzas')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.COBROS)
export class EgresosExencionesController {
  constructor(
    private readonly egresosService: EgresosService,
    private readonly exencionesService: ExencionesService,
    private readonly reportesService: ReportesService,
  ) {}

  @Get('egresos')
  @Roles(...LECTURA_FINANZAS)
  listarEgresos(@RedActual() red: ContextoRed) {
    return this.egresosService.listar(red);
  }

  @Post('egresos')
  @Roles(...GESTION_COBROS)
  @Throttle(LIMITE_ESCRITURA)
  registrarEgreso(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RegistrarEgresoDto,
  ) {
    return this.egresosService.registrar(red, usuario.idUsuario, dto);
  }

  @Post('egresos/:idEgreso/visado')
  @Roles(RolUsuario.PRESIDENTE)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  visarEgreso(
    @Param('idEgreso', ParseIdPipe) idEgreso: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DecidirDto,
  ) {
    return this.egresosService.visar(red, usuario.idUsuario, idEgreso, dto);
  }

  @Get('exenciones')
  @Roles(...LECTURA_FINANZAS)
  listarExenciones(@RedActual() red: ContextoRed) {
    return this.exencionesService.listar(red);
  }

  @Post('exenciones')
  @Roles(RolUsuario.TESORERO)
  @Throttle(LIMITE_ESCRITURA)
  solicitarExencion(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: SolicitarExencionDto,
  ) {
    return this.exencionesService.solicitarComoTesoreria(
      red,
      usuario.idUsuario,
      dto,
    );
  }

  @Post('mi-cuenta/exenciones')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  solicitarMiExencion(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: SolicitarExencionDto,
  ) {
    return this.exencionesService.solicitarComoResidente(
      red,
      usuario.idUsuario,
      dto,
    );
  }

  @Post('exenciones/:idExencion/revision')
  @Roles(RolUsuario.TESORERO)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  revisarExencion(
    @Param('idExencion', ParseIdPipe) idExencion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DecidirDto,
  ) {
    return this.exencionesService.revisar(
      red,
      usuario.idUsuario,
      idExencion,
      dto,
    );
  }

  @Post('exenciones/:idExencion/resolucion')
  @Roles(RolUsuario.PRESIDENTE)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  resolverExencion(
    @Param('idExencion', ParseIdPipe) idExencion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: DecidirDto,
  ) {
    return this.exencionesService.resolver(
      red,
      usuario.idUsuario,
      idExencion,
      dto,
    );
  }

  @Get('reportes')
  @Roles(...LECTURA_FINANZAS)
  reporte(@RedActual() red: ContextoRed, @Query() filtro: ReporteDto) {
    return this.reportesService.reporte(red, filtro.periodo);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CategoriasService } from './categorias.service';
import { CobrosService } from './cobros.service';
import {
  AvisarTransferenciaDto,
  CrearCobroDto,
  EditarCategoriaDto,
  EditarCobroDto,
  GuardarCategoriaDto,
  MarcarPagosDto,
  RechazarAvisosDto,
} from './dto/finanzas.dto';
import { EstadoCuentaService } from './estado-cuenta.service';
import { PagosService } from './pagos.service';
import { GESTION_COBROS, LECTURA_FINANZAS } from './reglas-finanzas';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('finanzas')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.COBROS)
export class FinanzasController {
  constructor(
    private readonly categoriasService: CategoriasService,
    private readonly cobrosService: CobrosService,
    private readonly pagosService: PagosService,
    private readonly estadoCuentaService: EstadoCuentaService,
  ) {}

  @Get('categorias')
  @Roles(...GESTION_COBROS)
  listarCategorias(@RedActual() red: ContextoRed) {
    return this.categoriasService.listar(red);
  }

  @Post('categorias')
  @Roles(RolUsuario.TESORERO)
  @Throttle(LIMITE_ESCRITURA)
  crearCategoria(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarCategoriaDto,
  ) {
    return this.categoriasService.crear(red, usuario.idUsuario, dto);
  }

  @Patch('categorias/:idCategoria')
  @Roles(RolUsuario.TESORERO)
  @Throttle(LIMITE_ESCRITURA)
  editarCategoria(
    @Param('idCategoria', ParseIdPipe) idCategoria: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: EditarCategoriaDto,
  ) {
    return this.categoriasService.editar(
      red,
      usuario.idUsuario,
      idCategoria,
      dto,
    );
  }

  @Get('cobros')
  @Roles(...LECTURA_FINANZAS)
  listarCobros(@RedActual() red: ContextoRed) {
    return this.cobrosService.listar(red);
  }

  @Post('cobros')
  @Roles(...GESTION_COBROS)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crearCobro(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearCobroDto,
  ) {
    return this.cobrosService.crear(red, usuario.idUsuario, dto);
  }

  @Patch('cobros/:idCobro')
  @Roles(...GESTION_COBROS)
  @Throttle(LIMITE_ESCRITURA)
  editarCobro(
    @Param('idCobro', ParseIdPipe) idCobro: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: EditarCobroDto,
  ) {
    return this.cobrosService.editar(red, usuario.idUsuario, idCobro, dto);
  }

  @Delete('cobros/:idCobro')
  @Roles(...GESTION_COBROS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  eliminarCobro(
    @Param('idCobro', ParseIdPipe) idCobro: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.cobrosService.eliminar(red, usuario.idUsuario, idCobro);
  }

  @Get('estado')
  @Roles(...LECTURA_FINANZAS)
  estado(@RedActual() red: ContextoRed) {
    return this.estadoCuentaService.estadoPanel(red);
  }

  @Get('unidades/:idUnidad')
  @Roles(...LECTURA_FINANZAS)
  detalleUnidad(
    @Param('idUnidad', ParseIdPipe) idUnidad: number,
    @RedActual() red: ContextoRed,
  ) {
    return this.estadoCuentaService.detalleUnidad(red, idUnidad);
  }

  @Post('pagos')
  @Roles(...GESTION_COBROS)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  marcarPagos(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: MarcarPagosDto,
  ) {
    return this.pagosService.marcarPagos(red, usuario.idUsuario, dto);
  }

  @Delete('cobro-unidades/:idCobroUnidad/pago')
  @Roles(...GESTION_COBROS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  anularPago(
    @Param('idCobroUnidad', ParseIdPipe) idCobroUnidad: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.pagosService.anularPago(red, usuario.idUsuario, idCobroUnidad);
  }

  @Post('avisos/rechazo')
  @Roles(...GESTION_COBROS)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  rechazarAvisos(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: RechazarAvisosDto,
  ) {
    return this.pagosService.rechazarAvisos(red, usuario.idUsuario, dto);
  }

  @Post('recordatorios')
  @Roles(...GESTION_COBROS)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  enviarRecordatorio(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.pagosService.enviarRecordatorio(red, usuario.idUsuario);
  }

  @Get('mi-cuenta')
  miCuenta(@RedActual() red: ContextoRed) {
    return this.estadoCuentaService.miCuenta(red);
  }

  @Post('avisos')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  avisarTransferencia(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: AvisarTransferenciaDto,
  ) {
    return this.estadoCuentaService.avisarTransferencia(
      red,
      usuario.idUsuario,
      dto,
    );
  }
}

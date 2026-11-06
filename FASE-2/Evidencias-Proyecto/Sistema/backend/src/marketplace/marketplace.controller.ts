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
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { PaginaMuroDto, ReportarPublicacionDto } from '../muro/dto/muro.dto';
import { ContactosMarketplaceService } from './contactos-marketplace.service';
import {
  EditarAvisoDto,
  PaginaAvisosDto,
  PedirContactoDto,
  PublicarAvisoDto,
  ResponderSolicitudDto,
} from './dto/marketplace.dto';
import { MarketplaceService } from './marketplace.service';
import { ModeracionMarketplaceService } from './moderacion-marketplace.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };
const LIMITE_CREACION = { default: { limit: 10, ttl: 60_000 } };

@Controller('marketplace')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.MARKETPLACE)
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly contactosService: ContactosMarketplaceService,
    private readonly moderacionService: ModeracionMarketplaceService,
  ) {}

  @Get()
  listar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Query() filtro: PaginaAvisosDto,
  ) {
    return this.marketplaceService.listar(red, usuario.idUsuario, filtro);
  }

  @Get('solicitudes')
  listarSolicitudes(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.contactosService.listar(red, usuario.idUsuario);
  }

  @Get('moderacion')
  @Roles(RolUsuario.ADMINISTRADOR)
  listarModeracion(
    @RedActual() red: ContextoRed,
    @Query() filtro: PaginaMuroDto,
  ) {
    return this.moderacionService.listar(red, filtro);
  }

  @Post()
  @Throttle(LIMITE_CREACION)
  publicar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: PublicarAvisoDto,
  ) {
    return this.marketplaceService.publicar(red, usuario.idUsuario, dto);
  }

  @Get(':idProducto')
  detalle(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.marketplaceService.detalle(red, usuario.idUsuario, idProducto);
  }

  @Put(':idProducto')
  @Throttle(LIMITE_ESCRITURA)
  editar(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: EditarAvisoDto,
  ) {
    return this.marketplaceService.editar(
      red,
      usuario.idUsuario,
      idProducto,
      dto,
    );
  }

  @Post(':idProducto/cierre')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  cerrar(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.marketplaceService.cerrar(red, usuario.idUsuario, idProducto);
  }

  @Delete(':idProducto/cierre')
  @Throttle(LIMITE_ESCRITURA)
  reabrir(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.marketplaceService.reabrir(red, usuario.idUsuario, idProducto);
  }

  @Delete(':idProducto')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  eliminar(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.marketplaceService.eliminarPropio(
      red,
      usuario.idUsuario,
      idProducto,
    );
  }

  @Post(':idProducto/reportes')
  @Throttle(LIMITE_CREACION)
  reportar(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ReportarPublicacionDto,
  ) {
    return this.marketplaceService.reportar(
      red,
      usuario.idUsuario,
      idProducto,
      dto,
    );
  }

  @Post(':idProducto/solicitudes')
  @Throttle(LIMITE_CREACION)
  pedirContacto(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: PedirContactoDto,
  ) {
    return this.contactosService.pedir(red, usuario.idUsuario, idProducto, dto);
  }

  @Delete('solicitudes/:idSolicitud')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  cancelarSolicitud(
    @Param('idSolicitud', ParseIdPipe) idSolicitud: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.contactosService.cancelar(red, usuario.idUsuario, idSolicitud);
  }

  @Post('solicitudes/:idSolicitud/respuesta')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  responderSolicitud(
    @Param('idSolicitud', ParseIdPipe) idSolicitud: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: ResponderSolicitudDto,
  ) {
    return this.contactosService.responder(
      red,
      usuario.idUsuario,
      idSolicitud,
      dto,
    );
  }

  @Post('solicitudes/:idSolicitud/vista')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle(LIMITE_ESCRITURA)
  marcarVista(
    @Param('idSolicitud', ParseIdPipe) idSolicitud: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.contactosService.marcarVista(
      red,
      usuario.idUsuario,
      idSolicitud,
    );
  }

  @Post(':idProducto/ocultar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  ocultar(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.moderacionService.ocultar(red, usuario.idUsuario, idProducto);
  }

  @Post(':idProducto/restaurar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  restaurar(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.moderacionService.restaurar(red, usuario.idUsuario, idProducto);
  }

  @Post(':idProducto/reportes/descarte')
  @Roles(RolUsuario.ADMINISTRADOR)
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  descartarReportes(
    @Param('idProducto', ParseIdPipe) idProducto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.moderacionService.descartarReportes(
      red,
      usuario.idUsuario,
      idProducto,
    );
  }
}

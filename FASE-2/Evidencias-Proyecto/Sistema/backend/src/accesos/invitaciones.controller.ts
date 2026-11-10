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
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CodigoModulo } from '../common/enums/modulo.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { CrearInvitacionDto } from './dto/accesos.dto';
import { InvitacionesService } from './invitaciones.service';

@Controller('invitaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequiereModulo(CodigoModulo.INVITACIONES_QR)
export class InvitacionesController {
  constructor(private readonly invitacionesService: InvitacionesService) {}

  @Get()
  listar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.invitacionesService.listar(red, usuario.idUsuario);
  }

  @Get(':idInvitacion')
  detalle(
    @Param('idInvitacion', ParseIdPipe) idInvitacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.invitacionesService.detalle(
      red,
      usuario.idUsuario,
      idInvitacion,
    );
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  crear(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: CrearInvitacionDto,
  ) {
    return this.invitacionesService.crear(red, usuario.idUsuario, dto);
  }

  @Post(':idInvitacion/cancelacion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  cancelar(
    @Param('idInvitacion', ParseIdPipe) idInvitacion: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.invitacionesService.cancelar(
      red,
      usuario.idUsuario,
      idInvitacion,
    );
  }
}

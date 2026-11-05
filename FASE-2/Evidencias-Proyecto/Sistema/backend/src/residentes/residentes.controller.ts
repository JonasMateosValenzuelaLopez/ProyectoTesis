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
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { AsignarCargoDto, InvitarResidenteDto } from './dto/residentes.dto';
import { ResidentesService } from './residentes.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('residentes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
export class ResidentesController {
  constructor(private readonly residentesService: ResidentesService) {}

  @Get()
  listar(@RedActual() red: ContextoRed) {
    return this.residentesService.listar(red);
  }

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  invitar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: InvitarResidenteDto,
  ) {
    return this.residentesService.invitar(red, usuario.idUsuario, dto);
  }

  @Post(':idUsuario/invitacion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  reenviarInvitacion(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.residentesService.reenviarInvitacion(
      red,
      usuario.idUsuario,
      idUsuario,
    );
  }

  @Post(':idUsuario/cargos')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  asignarCargo(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: AsignarCargoDto,
  ) {
    return this.residentesService.asignarCargo(
      red,
      usuario.idUsuario,
      idUsuario,
      dto,
    );
  }

  @Delete(':idUsuario/cargos/:idRol')
  @Throttle(LIMITE_ESCRITURA)
  quitarCargo(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @Param('idRol', ParseIntPipe) idRol: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.residentesService.quitarCargo(
      red,
      usuario.idUsuario,
      idUsuario,
      idRol,
    );
  }

  @Post(':idUsuario/desactivacion')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  desactivar(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.residentesService.desactivar(red, usuario.idUsuario, idUsuario);
  }

  @Delete(':idUsuario/desactivacion')
  @Throttle(LIMITE_ESCRITURA)
  reactivar(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.residentesService.reactivar(red, usuario.idUsuario, idUsuario);
  }
}

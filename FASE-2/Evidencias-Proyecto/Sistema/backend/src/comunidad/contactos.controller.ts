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
import { Roles } from '../auth/decorators/roles.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ContactosService, EDITORES_CONTACTOS } from './contactos.service';
import { GuardarContactoDto } from './dto/guardar-contacto.dto';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('comunidad/contactos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContactosController {
  constructor(private readonly contactosService: ContactosService) {}

  @Get()
  listar(@RedActual() red: ContextoRed) {
    return this.contactosService.listar(red);
  }

  @Post()
  @Roles(...EDITORES_CONTACTOS)
  @Throttle(LIMITE_ESCRITURA)
  crear(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarContactoDto,
  ) {
    return this.contactosService.crear(red, usuario.idUsuario, dto);
  }

  @Put(':idContacto')
  @Roles(...EDITORES_CONTACTOS)
  @Throttle(LIMITE_ESCRITURA)
  actualizar(
    @Param('idContacto', ParseIdPipe) idContacto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: GuardarContactoDto,
  ) {
    return this.contactosService.actualizar(
      red,
      usuario.idUsuario,
      idContacto,
      dto,
    );
  }

  @Delete(':idContacto')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(...EDITORES_CONTACTOS)
  @Throttle(LIMITE_ESCRITURA)
  eliminar(
    @Param('idContacto', ParseIdPipe) idContacto: number,
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.contactosService.eliminar(red, usuario.idUsuario, idContacto);
  }
}

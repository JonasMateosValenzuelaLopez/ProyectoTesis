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
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlataformaGuard } from '../auth/guards/plataforma.guard';
import type { UsuarioAutenticado } from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import {
  BloquearCuentaDto,
  ListarPersonasDto,
} from './dto/personas-plataforma.dto';
import { PersonasPlataformaService } from './personas-plataforma.service';

const LIMITE_ESCRITURA = { default: { limit: 30, ttl: 60_000 } };

@Controller('plataforma/personas')
@UseGuards(JwtAuthGuard, PlataformaGuard)
export class PersonasPlataformaController {
  constructor(private readonly personasService: PersonasPlataformaService) {}

  @Get()
  listar(@Query() filtro: ListarPersonasDto) {
    return this.personasService.listar(filtro);
  }

  @Post(':idUsuario/bloqueo')
  @HttpCode(HttpStatus.OK)
  @Throttle(LIMITE_ESCRITURA)
  bloquear(
    @Param('idUsuario', ParseIdPipe) idUsuario: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Body() dto: BloquearCuentaDto,
  ) {
    return this.personasService.bloquear(
      idUsuario,
      usuario.idUsuario,
      dto.motivo,
    );
  }

  @Delete(':idUsuario/bloqueo')
  @Throttle(LIMITE_ESCRITURA)
  desbloquear(
    @Param('idUsuario', ParseIdPipe) idUsuario: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.personasService.desbloquear(idUsuario, usuario.idUsuario);
  }

  @Post(':idUsuario/acceso')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  reenviarAcceso(
    @Param('idUsuario', ParseIdPipe) idUsuario: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ) {
    return this.personasService.reenviarAcceso(idUsuario, usuario.idUsuario);
  }
}

import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { UsuarioActual } from '../auth/decorators/usuario-actual.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type {
  ContextoRed,
  UsuarioAutenticado,
} from '../common/interfaces/jwt-payload.interface';
import { ParseIdPipe } from '../common/pipes/parse-id.pipe';
import { ResidenciasService } from './residencias.service';

@Controller('residencias')
export class ResidenciasController {
  constructor(private readonly residenciasService: ResidenciasService) {}

  @Post(':idResidencia/guia-vista')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  marcarGuiaVista(
    @Param('idResidencia', ParseIdPipe) idResidencia: number,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @RedActual() red: ContextoRed,
  ) {
    return this.residenciasService.marcarGuiaVista(
      idResidencia,
      usuario.idUsuario,
      red,
    );
  }
}

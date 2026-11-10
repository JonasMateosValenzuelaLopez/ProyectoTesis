import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RedActual } from '../auth/decorators/red-actual.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import type { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { BitacoraComunidadService } from './bitacora-comunidad.service';
import { ListarBitacoraDto } from './dto/listar-bitacora.dto';

@Controller('bitacora')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.PRESIDENTE, RolUsuario.ADMINISTRADOR)
export class BitacoraController {
  constructor(private readonly bitacoraService: BitacoraComunidadService) {}

  @Get()
  listar(@RedActual() red: ContextoRed, @Query() filtro: ListarBitacoraDto) {
    return this.bitacoraService.listar(red, filtro);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlataformaGuard } from '../auth/guards/plataforma.guard';
import { BitacoraPlataformaService } from './bitacora-plataforma.service';
import { ListarBitacoraPlataformaDto } from './dto/listar-bitacora-plataforma.dto';

@Controller('plataforma/bitacora')
@UseGuards(JwtAuthGuard, PlataformaGuard)
export class BitacoraPlataformaController {
  constructor(private readonly bitacoraService: BitacoraPlataformaService) {}

  @Get()
  listar(@Query() filtro: ListarBitacoraPlataformaDto) {
    return this.bitacoraService.listar(filtro);
  }
}

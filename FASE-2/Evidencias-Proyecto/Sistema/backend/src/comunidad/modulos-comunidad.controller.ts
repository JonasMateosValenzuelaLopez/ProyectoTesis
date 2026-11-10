import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RedActual } from '../auth/decorators/red-actual.decorator';
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
import { CambiarModuloDto } from '../plataforma/dto/cambiar-comunidad.dto';
import { ModulosComunidadService } from './modulos-comunidad.service';

const LIMITE_ESCRITURA = { default: { limit: 20, ttl: 60_000 } };

@Controller('comunidad/modulos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ModulosComunidadController {
  constructor(
    private readonly modulosComunidadService: ModulosComunidadService,
  ) {}

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  listar(@RedActual() red: ContextoRed) {
    return this.modulosComunidadService.listar(red.idRed);
  }

  @Put(':codigoModulo')
  @Roles(RolUsuario.ADMINISTRADOR)
  @Throttle(LIMITE_ESCRITURA)
  cambiar(
    @RedActual() red: ContextoRed,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Param(
      'codigoModulo',
      new ParseEnumPipe(CodigoModulo, {
        exceptionFactory: () => new BadRequestException('El módulo no existe'),
      }),
    )
    codigoModulo: CodigoModulo,
    @Body() dto: CambiarModuloDto,
  ) {
    return this.modulosComunidadService.cambiar(
      red.idRed,
      usuario.idUsuario,
      codigoModulo,
      dto.activo,
    );
  }
}

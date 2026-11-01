import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { UnidadesService } from './unidades.service';
import { CreateUnidadeDto } from './dto/create-unidad.dto';
import { UpdateUnidadeDto } from './dto/update-unidad.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRADOR)
@Controller('unidades')
export class UnidadesController {
  constructor(private readonly unidadesService: UnidadesService) {}

  @Post()
  create(@Body() createUnidadeDto: CreateUnidadeDto) {
    return this.unidadesService.create(createUnidadeDto);
  }

  @Get()
  findAll() {
    return this.unidadesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unidadesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnidadeDto: UpdateUnidadeDto) {
    return this.unidadesService.update(+id, updateUnidadeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unidadesService.remove(+id);
  }
}

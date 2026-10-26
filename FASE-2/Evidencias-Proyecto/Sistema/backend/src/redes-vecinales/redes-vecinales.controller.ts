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
import { RedesVecinalesService } from './redes-vecinales.service';
import { CreateRedesVecinaleDto } from './dto/create-red-vecinal.dto';
import { UpdateRedesVecinaleDto } from './dto/update-red-vecinal.dto';

// Plantilla sin implementar: protegida por defecto hasta definir sus permisos.
// Al implementarla, filtrar cada consulta por la comunidad de @RedActual().
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RolUsuario.ADMINISTRACION)
@Controller('redes-vecinales')
export class RedesVecinalesController {
  constructor(private readonly redesVecinalesService: RedesVecinalesService) {}

  @Post()
  create(@Body() createRedesVecinaleDto: CreateRedesVecinaleDto) {
    return this.redesVecinalesService.create(createRedesVecinaleDto);
  }

  @Get()
  findAll() {
    return this.redesVecinalesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.redesVecinalesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRedesVecinaleDto: UpdateRedesVecinaleDto,
  ) {
    return this.redesVecinalesService.update(+id, updateRedesVecinaleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.redesVecinalesService.remove(+id);
  }
}

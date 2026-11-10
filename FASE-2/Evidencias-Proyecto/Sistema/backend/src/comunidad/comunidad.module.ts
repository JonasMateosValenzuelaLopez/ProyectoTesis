import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { ContactosController } from './contactos.controller';
import { ContactosService } from './contactos.service';
import { DatosComunidadController } from './datos-comunidad.controller';
import { DatosComunidadService } from './datos-comunidad.service';
import { ComunidadContacto } from './entities/comunidad-contacto.entity';
import { ComunidadGuia } from './entities/comunidad-guia.entity';
import { GuiaController } from './guia.controller';
import { GuiaService } from './guia.service';
import { ModulosComunidadController } from './modulos-comunidad.controller';
import { ModulosComunidadService } from './modulos-comunidad.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComunidadGuia, ComunidadContacto, Membresia]),
  ],
  controllers: [
    GuiaController,
    ContactosController,
    DatosComunidadController,
    ModulosComunidadController,
  ],
  providers: [
    GuiaService,
    ContactosService,
    DatosComunidadService,
    ModulosComunidadService,
  ],
})
export class ComunidadModule {}

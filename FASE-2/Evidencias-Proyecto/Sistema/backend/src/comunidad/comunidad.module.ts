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

@Module({
  imports: [
    TypeOrmModule.forFeature([ComunidadGuia, ComunidadContacto, Membresia]),
  ],
  controllers: [GuiaController, ContactosController, DatosComunidadController],
  providers: [GuiaService, ContactosService, DatosComunidadService],
})
export class ComunidadModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutorizacionesController } from './autorizaciones.controller';
import { AutorizacionesService } from './autorizaciones.service';
import { Invitacion } from './entities/invitacion.entity';
import { RegistroAcceso } from './entities/registro-acceso.entity';
import { Vehiculo } from './entities/vehiculo.entity';
import { Visitante } from './entities/visitante.entity';
import { InvitacionesController } from './invitaciones.controller';
import { InvitacionesService } from './invitaciones.service';
import { PorteriaController } from './porteria.controller';
import { PorteriaService } from './porteria.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitacion, RegistroAcceso, Visitante, Vehiculo]),
  ],
  controllers: [
    InvitacionesController,
    PorteriaController,
    AutorizacionesController,
  ],
  providers: [InvitacionesService, PorteriaService, AutorizacionesService],
})
export class AccesosModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutorizacionesController } from './autorizaciones.controller';
import { AutorizacionesService } from './autorizaciones.service';
import { Invitacion } from './entities/invitacion.entity';
import { RegistroAcceso } from './entities/registro-acceso.entity';
import { RetencionAcceso } from './entities/retencion-acceso.entity';
import { Vehiculo } from './entities/vehiculo.entity';
import { Visitante } from './entities/visitante.entity';
import { InvitacionesController } from './invitaciones.controller';
import { InvitacionesService } from './invitaciones.service';
import { PorteriaController } from './porteria.controller';
import { PorteriaService } from './porteria.service';
import { RetencionAccesosService } from './retencion-accesos.service';
import { RetencionesController } from './retenciones.controller';
import { TareaRetencionAccesos } from './tarea-retencion-accesos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invitacion,
      RegistroAcceso,
      Visitante,
      Vehiculo,
      RetencionAcceso,
    ]),
  ],
  controllers: [
    InvitacionesController,
    RetencionesController,
    PorteriaController,
    AutorizacionesController,
  ],
  providers: [
    InvitacionesService,
    PorteriaService,
    AutorizacionesService,
    RetencionAccesosService,
    TareaRetencionAccesos,
  ],
})
export class AccesosModule {}

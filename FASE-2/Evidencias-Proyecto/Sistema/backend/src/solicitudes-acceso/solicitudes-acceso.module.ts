import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SolicitudAcceso } from './entities/solicitud-acceso.entity';
import { SolicitudesAccesoController } from './solicitudes-acceso.controller';
import { SolicitudesAccesoService } from './solicitudes-acceso.service';

@Module({
  imports: [TypeOrmModule.forFeature([SolicitudAcceso])],
  controllers: [SolicitudesAccesoController],
  providers: [SolicitudesAccesoService],
})
export class SolicitudesAccesoModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CancelacionesService } from './cancelaciones.service';
import { EspacioComun } from './entities/espacio-comun.entity';
import { ReservaBloque } from './entities/reserva-bloque.entity';
import { Reserva } from './entities/reserva.entity';
import { EspaciosController } from './espacios.controller';
import { EspaciosService } from './espacios.service';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  imports: [TypeOrmModule.forFeature([EspacioComun, ReservaBloque, Reserva])],
  controllers: [EspaciosController, ReservasController],
  providers: [EspaciosService, ReservasService, CancelacionesService],
})
export class ReservasModule {}

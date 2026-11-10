import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActasController } from './actas.controller';
import { ActasService } from './actas.service';
import { Acta } from './entities/acta.entity';
import { AcuerdoActa } from './entities/acuerdo-acta.entity';
import { VotacionOpcion } from './entities/votacion-opcion.entity';
import { Votacion } from './entities/votacion.entity';
import { Voto } from './entities/voto.entity';
import { VotacionesController } from './votaciones.controller';
import { VotacionesService } from './votaciones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Votacion,
      VotacionOpcion,
      Voto,
      Acta,
      AcuerdoActa,
    ]),
  ],
  controllers: [VotacionesController, ActasController],
  providers: [VotacionesService, ActasService],
})
export class VotacionesModule {}

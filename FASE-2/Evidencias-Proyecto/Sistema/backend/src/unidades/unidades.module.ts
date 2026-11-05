import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { Unidad } from './entities/unidad.entity';
import { UnidadesController } from './unidades.controller';
import { UnidadesService } from './unidades.service';

@Module({
  imports: [TypeOrmModule.forFeature([Unidad, Residencia, Membresia])],
  controllers: [UnidadesController],
  providers: [UnidadesService],
})
export class UnidadesModule {}

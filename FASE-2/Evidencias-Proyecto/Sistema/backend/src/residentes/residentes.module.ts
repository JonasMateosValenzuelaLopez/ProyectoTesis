import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { ResidentesController } from './residentes.controller';
import { ResidentesService } from './residentes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Membresia, Residencia])],
  controllers: [ResidentesController],
  providers: [ResidentesService],
})
export class ResidentesModule {}

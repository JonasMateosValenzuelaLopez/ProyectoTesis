import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MuroPublicacion } from './entities/muro-publicacion.entity';
import { MuroReporte } from './entities/muro-reporte.entity';
import { ModeracionService } from './moderacion.service';
import { MuroController } from './muro.controller';
import { MuroService } from './muro.service';
import { OficialesService } from './oficiales.service';

@Module({
  imports: [TypeOrmModule.forFeature([MuroPublicacion, MuroReporte])],
  controllers: [MuroController],
  providers: [MuroService, OficialesService, ModeracionService],
})
export class MuroModule {}

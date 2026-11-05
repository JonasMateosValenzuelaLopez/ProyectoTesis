import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { ComunidadGuia } from './entities/comunidad-guia.entity';
import { GuiaController } from './guia.controller';
import { GuiaService } from './guia.service';

@Module({
  imports: [TypeOrmModule.forFeature([ComunidadGuia, Membresia])],
  controllers: [GuiaController],
  providers: [GuiaService],
})
export class ComunidadModule {}

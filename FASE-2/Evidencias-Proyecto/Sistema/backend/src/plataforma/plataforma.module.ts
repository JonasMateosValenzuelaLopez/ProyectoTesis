import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { PlataformaController } from './plataforma.controller';
import { PlataformaService } from './plataforma.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RedVecinal, Unidad, Membresia, RedModulo]),
  ],
  controllers: [PlataformaController],
  providers: [PlataformaService],
})
export class PlataformaModule {}

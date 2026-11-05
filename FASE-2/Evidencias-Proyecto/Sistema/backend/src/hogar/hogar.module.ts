import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HogarFicha } from './entities/hogar-ficha.entity';
import { HogarController } from './hogar.controller';
import { HogarService } from './hogar.service';

@Module({
  imports: [TypeOrmModule.forFeature([HogarFicha])],
  controllers: [HogarController],
  providers: [HogarService],
})
export class HogarModule {}

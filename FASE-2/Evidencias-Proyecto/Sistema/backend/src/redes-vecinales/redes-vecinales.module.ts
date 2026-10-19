import { Module } from '@nestjs/common';
import { RedesVecinalesService } from './redes-vecinales.service';
import { RedesVecinalesController } from './redes-vecinales.controller';

@Module({
  controllers: [RedesVecinalesController],
  providers: [RedesVecinalesService],
})
export class RedesVecinalesModule {}

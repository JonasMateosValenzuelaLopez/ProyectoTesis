import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraService } from './bitacora.service';
import { BitacoraAuditoria } from './entities/bitacora-auditoria.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BitacoraAuditoria])],
  providers: [BitacoraService],
  exports: [BitacoraService],
})
export class BitacoraModule {}

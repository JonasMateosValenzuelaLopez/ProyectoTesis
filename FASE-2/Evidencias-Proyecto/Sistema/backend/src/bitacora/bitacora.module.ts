import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraComunidadService } from './bitacora-comunidad.service';
import { BitacoraController } from './bitacora.controller';
import { BitacoraService } from './bitacora.service';
import { BitacoraAuditoria } from './entities/bitacora-auditoria.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([BitacoraAuditoria])],
  controllers: [BitacoraController],
  providers: [BitacoraService, BitacoraComunidadService],
  exports: [BitacoraService],
})
export class BitacoraModule {}

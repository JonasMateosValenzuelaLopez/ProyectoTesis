import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraAuditoria } from '../bitacora/entities/bitacora-auditoria.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraPlataformaController } from './bitacora-plataforma.controller';
import { BitacoraPlataformaService } from './bitacora-plataforma.service';
import { PlataformaController } from './plataforma.controller';
import { PlataformaService } from './plataforma.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RedVecinal,
      Unidad,
      Membresia,
      RedModulo,
      BitacoraAuditoria,
      Usuario,
    ]),
  ],
  controllers: [PlataformaController, BitacoraPlataformaController],
  providers: [PlataformaService, BitacoraPlataformaService],
})
export class PlataformaModule {}

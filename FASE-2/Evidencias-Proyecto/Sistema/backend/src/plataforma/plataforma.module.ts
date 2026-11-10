import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraAuditoria } from '../bitacora/entities/bitacora-auditoria.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { EspacioComun } from '../reservas/entities/espacio-comun.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AltaComunidadService } from './alta-comunidad.service';
import { BitacoraPlataformaController } from './bitacora-plataforma.controller';
import { BitacoraPlataformaService } from './bitacora-plataforma.service';
import { PersonasPlataformaController } from './personas-plataforma.controller';
import { PersonasPlataformaService } from './personas-plataforma.service';
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
      EspacioComun,
    ]),
  ],
  controllers: [
    PlataformaController,
    BitacoraPlataformaController,
    PersonasPlataformaController,
  ],
  providers: [
    PlataformaService,
    AltaComunidadService,
    BitacoraPlataformaService,
    PersonasPlataformaService,
  ],
})
export class PlataformaModule {}

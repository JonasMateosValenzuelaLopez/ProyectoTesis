import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasService } from './categorias.service';
import { CobrosService } from './cobros.service';
import { CorreosFinanzasService } from './correos-finanzas.service';
import { AvisoPago } from './entities/aviso-pago.entity';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { Exencion } from './entities/exencion.entity';
import { NotificacionEnviada } from './entities/notificacion-enviada.entity';
import { EstadoCuentaService } from './estado-cuenta.service';
import { FinanzasController } from './finanzas.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoriaGasto,
      Cobro,
      CobroUnidad,
      AvisoPago,
      Exencion,
      NotificacionEnviada,
    ]),
  ],
  controllers: [FinanzasController],
  providers: [
    CategoriasService,
    CobrosService,
    PagosService,
    EstadoCuentaService,
    CorreosFinanzasService,
  ],
})
export class FinanzasModule {}

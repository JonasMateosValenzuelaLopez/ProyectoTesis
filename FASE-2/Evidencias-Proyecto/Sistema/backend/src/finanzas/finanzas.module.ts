import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriasService } from './categorias.service';
import { CobrosService } from './cobros.service';
import { EgresosExencionesController } from './egresos-exenciones.controller';
import { EgresosService } from './egresos.service';
import { AvisoPago } from './entities/aviso-pago.entity';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { Egreso } from './entities/egreso.entity';
import { Exencion } from './entities/exencion.entity';
import { NotificacionEnviada } from './entities/notificacion-enviada.entity';
import { EstadoCuentaService } from './estado-cuenta.service';
import { ExencionesService } from './exenciones.service';
import { FinanzasController } from './finanzas.controller';
import { PagosService } from './pagos.service';
import { ReportesService } from './reportes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoriaGasto,
      Cobro,
      CobroUnidad,
      AvisoPago,
      Exencion,
      Egreso,
      NotificacionEnviada,
    ]),
  ],
  controllers: [FinanzasController, EgresosExencionesController],
  providers: [
    CategoriasService,
    CobrosService,
    PagosService,
    EstadoCuentaService,
    EgresosService,
    ExencionesService,
    ReportesService,
  ],
})
export class FinanzasModule {}

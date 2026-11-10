import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MuroReporte } from '../muro/entities/muro-reporte.entity';
import { ContactosMarketplaceService } from './contactos-marketplace.service';
import { MarketplacePublicacion } from './entities/marketplace-publicacion.entity';
import { MarketplaceSolicitudContacto } from './entities/marketplace-solicitud-contacto.entity';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceService } from './marketplace.service';
import { ModeracionMarketplaceService } from './moderacion-marketplace.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketplacePublicacion,
      MarketplaceSolicitudContacto,
      MuroReporte,
    ]),
  ],
  controllers: [MarketplaceController],
  providers: [
    MarketplaceService,
    ContactosMarketplaceService,
    ModeracionMarketplaceService,
  ],
})
export class MarketplaceModule {}

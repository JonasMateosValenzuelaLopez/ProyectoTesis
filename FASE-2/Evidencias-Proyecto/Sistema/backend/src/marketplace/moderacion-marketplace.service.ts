import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { PaginaMuroDto } from '../muro/dto/muro.dto';
import { EstadoModeracion } from '../muro/entities/muro-publicacion.entity';
import {
  EstadoReporte,
  LugarPublicacion,
} from '../muro/entities/muro-reporte.entity';
import {
  reportesPendientesDe,
  resolverReportesPendientes,
  viviendasPorUsuario,
} from '../muro/reportes-publicacion';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { MarketplacePublicacion } from './entities/marketplace-publicacion.entity';
import { persona, serializarAviso } from './presentacion-marketplace';
import { LIMITE_POR_DEFECTO } from './reglas-marketplace';

type Accion = 'ocultar' | 'restaurar' | 'descartar';

const ACCION_BITACORA: Record<Accion, string> = {
  ocultar: 'ocultar_publicacion',
  restaurar: 'restaurar_publicacion',
  descartar: 'descartar_reportes',
};

@Injectable()
export class ModeracionMarketplaceService {
  constructor(
    @InjectRepository(MarketplacePublicacion)
    private readonly avisosRepository: Repository<MarketplacePublicacion>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed, filtro: PaginaMuroDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const filas = await this.avisosRepository.find({
      where: {
        idRed: red.idRed,
        ...(filtro.antesDe ? { idProducto: LessThan(filtro.antesDe) } : {}),
      },
      relations: { unidad: true },
      order: { idProducto: 'DESC' },
      take: limite + 1,
    });
    const avisos = filas.slice(0, limite);
    return {
      avisos: await this.conReportes(red, avisos),
      siguiente:
        filas.length > limite ? avisos[avisos.length - 1].idProducto : null,
    };
  }

  ocultar(red: ContextoRed, idUsuario: number, idProducto: number) {
    return this.moderar(red, idUsuario, idProducto, 'ocultar');
  }

  restaurar(red: ContextoRed, idUsuario: number, idProducto: number) {
    return this.moderar(red, idUsuario, idProducto, 'restaurar');
  }

  descartarReportes(red: ContextoRed, idUsuario: number, idProducto: number) {
    return this.moderar(red, idUsuario, idProducto, 'descartar');
  }

  private async moderar(
    red: ContextoRed,
    idUsuario: number,
    idProducto: number,
    accion: Accion,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const aviso = await manager.findOne(MarketplacePublicacion, {
        where: { idProducto, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!aviso) {
        throw new NotFoundException('Aviso no encontrado');
      }
      const ahora = new Date();
      let resueltos = 0;
      if (accion === 'ocultar') {
        if (aviso.estadoModeracion === EstadoModeracion.OCULTA) {
          throw new ConflictException('El aviso ya está oculto');
        }
        await manager.update(
          MarketplacePublicacion,
          { idProducto },
          {
            estadoModeracion: EstadoModeracion.OCULTA,
            moderadoPor: idUsuario,
            moderadoEn: ahora,
          },
        );
        resueltos = await resolverReportesPendientes(
          manager,
          LugarPublicacion.MARKETPLACE,
          idProducto,
          EstadoReporte.ATENDIDO,
          idUsuario,
          ahora,
        );
      } else if (accion === 'restaurar') {
        if (aviso.estadoModeracion !== EstadoModeracion.OCULTA) {
          throw new ConflictException('El aviso no está oculto');
        }
        await manager.update(
          MarketplacePublicacion,
          { idProducto },
          {
            estadoModeracion: EstadoModeracion.PUBLICADA,
            moderadoPor: idUsuario,
            moderadoEn: ahora,
          },
        );
      } else {
        resueltos = await resolverReportesPendientes(
          manager,
          LugarPublicacion.MARKETPLACE,
          idProducto,
          EstadoReporte.DESCARTADO,
          idUsuario,
          ahora,
        );
        if (resueltos === 0) {
          throw new ConflictException('El aviso no tiene reportes pendientes');
        }
      }
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: ACCION_BITACORA[accion],
          entidad: 'marketplace_publicaciones',
          idEntidad: idProducto,
          detalle: {
            autor: aviso.idUsuario,
            titulo: aviso.titulo,
            reportesResueltos: resueltos,
          },
        },
        manager,
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    const aviso = await this.avisosRepository.findOneOrFail({
      where: { idProducto, idRed: red.idRed },
      relations: { unidad: true },
    });
    const [resultado] = await this.conReportes(red, [aviso]);
    return resultado;
  }

  private async conReportes(
    red: ContextoRed,
    avisos: MarketplacePublicacion[],
  ) {
    const manager = this.dataSource.manager;
    const reportes = await reportesPendientesDe(
      manager,
      LugarPublicacion.MARKETPLACE,
      avisos.map((a) => a.idProducto),
    );
    const reportantes = [...new Set(reportes.map((r) => r.idUsuario))];
    const [nombres, viviendaDe] = await Promise.all([
      nombresPorId(manager, [
        ...avisos.flatMap((a) => [a.idUsuario, a.moderadoPor]),
        ...reportantes,
      ]),
      viviendasPorUsuario(manager, red.idRed, reportantes),
    ]);
    return avisos.map((aviso) => ({
      ...serializarAviso(aviso, nombres),
      moderadoPor: persona(nombres, aviso.moderadoPor),
      reportes: reportes
        .filter((r) => r.idPublicacion === aviso.idProducto)
        .map((r) => ({
          idReporte: r.idReporte,
          motivo: r.motivo,
          fecha: r.fechaCreacion,
          reportadoPor: persona(nombres, r.idUsuario),
          vivienda: viviendaDe.get(r.idUsuario) ?? null,
        })),
    }));
  }
}

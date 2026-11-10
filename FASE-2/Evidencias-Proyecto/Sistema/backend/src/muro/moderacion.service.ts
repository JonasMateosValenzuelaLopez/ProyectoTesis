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
import { PaginaMuroDto } from './dto/muro.dto';
import {
  EstadoModeracion,
  MuroPublicacion,
  TipoPublicacion,
} from './entities/muro-publicacion.entity';
import {
  EstadoReporte,
  LugarPublicacion,
} from './entities/muro-reporte.entity';
import {
  contextoPresentacion,
  persona,
  serializarPublicacion,
} from './presentacion-muro';
import {
  reportesPendientesDe,
  resolverReportesPendientes,
  viviendasPorUsuario,
} from './reportes-publicacion';

const LIMITE_POR_DEFECTO = 50;

type Accion = 'ocultar' | 'restaurar' | 'descartar';

@Injectable()
export class ModeracionService {
  constructor(
    @InjectRepository(MuroPublicacion)
    private readonly publicacionesRepository: Repository<MuroPublicacion>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed, filtro: PaginaMuroDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const filas = await this.publicacionesRepository.find({
      where: {
        idRed: red.idRed,
        tipo: TipoPublicacion.VECINO,
        ...(filtro.antesDe ? { idPublicacion: LessThan(filtro.antesDe) } : {}),
      },
      relations: { unidad: true },
      order: { idPublicacion: 'DESC' },
      take: limite + 1,
    });
    const publicaciones = filas.slice(0, limite);
    return {
      publicaciones: await this.conReportes(red, publicaciones),
      siguiente:
        filas.length > limite
          ? publicaciones[publicaciones.length - 1].idPublicacion
          : null,
    };
  }

  ocultar(red: ContextoRed, idUsuario: number, idPublicacion: number) {
    return this.moderar(red, idUsuario, idPublicacion, 'ocultar');
  }

  restaurar(red: ContextoRed, idUsuario: number, idPublicacion: number) {
    return this.moderar(red, idUsuario, idPublicacion, 'restaurar');
  }

  descartarReportes(
    red: ContextoRed,
    idUsuario: number,
    idPublicacion: number,
  ) {
    return this.moderar(red, idUsuario, idPublicacion, 'descartar');
  }

  private async moderar(
    red: ContextoRed,
    idUsuario: number,
    idPublicacion: number,
    accion: Accion,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const publicacion = await manager.findOne(MuroPublicacion, {
        where: {
          idPublicacion,
          idRed: red.idRed,
          tipo: TipoPublicacion.VECINO,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!publicacion) {
        throw new NotFoundException('Publicación no encontrada');
      }
      const ahora = new Date();
      let resueltos = 0;
      if (accion === 'ocultar') {
        if (publicacion.estadoModeracion === EstadoModeracion.OCULTA) {
          throw new ConflictException('La publicación ya está oculta');
        }
        await manager.update(
          MuroPublicacion,
          { idPublicacion },
          {
            estadoModeracion: EstadoModeracion.OCULTA,
            moderadoPor: idUsuario,
            moderadoEn: ahora,
          },
        );
        resueltos = await resolverReportesPendientes(
          manager,
          LugarPublicacion.MURO,
          idPublicacion,
          EstadoReporte.ATENDIDO,
          idUsuario,
          ahora,
        );
      } else if (accion === 'restaurar') {
        if (publicacion.estadoModeracion !== EstadoModeracion.OCULTA) {
          throw new ConflictException('La publicación no está oculta');
        }
        await manager.update(
          MuroPublicacion,
          { idPublicacion },
          {
            estadoModeracion: EstadoModeracion.PUBLICADA,
            moderadoPor: idUsuario,
            moderadoEn: ahora,
          },
        );
      } else {
        resueltos = await resolverReportesPendientes(
          manager,
          LugarPublicacion.MURO,
          idPublicacion,
          EstadoReporte.DESCARTADO,
          idUsuario,
          ahora,
        );
        if (resueltos === 0) {
          throw new ConflictException(
            'La publicación no tiene reportes pendientes',
          );
        }
      }
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: {
            ocultar: 'ocultar_publicacion',
            restaurar: 'restaurar_publicacion',
            descartar: 'descartar_reportes',
          }[accion],
          entidad: 'muro_publicaciones',
          idEntidad: idPublicacion,
          detalle: {
            autor: publicacion.idUsuario,
            contenido: publicacion.contenido.slice(0, 100),
            reportesResueltos: resueltos,
          },
        },
        manager,
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    const publicacion = await this.publicacionesRepository.findOneOrFail({
      where: { idPublicacion, idRed: red.idRed },
      relations: { unidad: true },
    });
    const [resultado] = await this.conReportes(red, [publicacion]);
    return resultado;
  }

  private async conReportes(
    red: ContextoRed,
    publicaciones: MuroPublicacion[],
  ) {
    const manager = this.dataSource.manager;
    const reportes = await reportesPendientesDe(
      manager,
      LugarPublicacion.MURO,
      publicaciones.map((p) => p.idPublicacion),
    );
    const reportantes = [...new Set(reportes.map((r) => r.idUsuario))];
    const [contexto, viviendaDe] = await Promise.all([
      contextoPresentacion(manager, red.idRed, publicaciones, reportantes),
      viviendasPorUsuario(manager, red.idRed, reportantes),
    ]);
    return publicaciones.map((publicacion) => ({
      ...serializarPublicacion(publicacion, contexto),
      moderadoPor: persona(contexto, publicacion.moderadoPor),
      reportes: reportes
        .filter((r) => r.idPublicacion === publicacion.idPublicacion)
        .map((r) => ({
          idReporte: r.idReporte,
          motivo: r.motivo,
          fecha: r.fechaCreacion,
          reportadoPor: persona(contexto, r.idUsuario),
          vivienda: viviendaDe.get(r.idUsuario) ?? null,
        })),
    }));
  }
}

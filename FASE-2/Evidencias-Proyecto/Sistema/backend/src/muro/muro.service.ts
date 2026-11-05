import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  PaginaMuroDto,
  PublicarVecinoDto,
  ReportarPublicacionDto,
} from './dto/muro.dto';
import {
  EstadoAprobacion,
  EstadoModeracion,
  MuroPublicacion,
  TIPOS_OFICIALES,
  TipoPublicacion,
} from './entities/muro-publicacion.entity';
import { LugarPublicacion, MuroReporte } from './entities/muro-reporte.entity';
import {
  contextoPresentacion,
  serializarPublicacion,
} from './presentacion-muro';

const LIMITE_POR_DEFECTO = 50;

@Injectable()
export class MuroService {
  constructor(
    @InjectRepository(MuroPublicacion)
    private readonly publicacionesRepository: Repository<MuroPublicacion>,
    @InjectRepository(MuroReporte)
    private readonly reportesRepository: Repository<MuroReporte>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed, idUsuario: number, filtro: PaginaMuroDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const cursor = filtro.antesDe
      ? { idPublicacion: LessThan(filtro.antesDe) }
      : {};
    const filas = await this.publicacionesRepository.find({
      where: [
        {
          idRed: red.idRed,
          tipo: In(TIPOS_OFICIALES),
          estadoAprobacion: EstadoAprobacion.APROBADA,
          ...cursor,
        },
        {
          idRed: red.idRed,
          tipo: TipoPublicacion.VECINO,
          estadoModeracion: EstadoModeracion.PUBLICADA,
          ...cursor,
        },
        {
          idRed: red.idRed,
          tipo: TipoPublicacion.VECINO,
          idUsuario,
          ...cursor,
        },
      ],
      relations: { unidad: true },
      order: { idPublicacion: 'DESC' },
      take: limite + 1,
    });
    const publicaciones = filas.slice(0, limite);
    const ids = publicaciones.map((p) => p.idPublicacion);
    const [contexto, misReportes] = await Promise.all([
      contextoPresentacion(this.dataSource.manager, red.idRed, publicaciones),
      ids.length
        ? this.reportesRepository.find({
            select: { idPublicacion: true },
            where: {
              tipoPublicacion: LugarPublicacion.MURO,
              idPublicacion: In(ids),
              idUsuario,
            },
            withDeleted: true,
          })
        : Promise.resolve([] as MuroReporte[]),
    ]);
    const reportadas = new Set(misReportes.map((r) => r.idPublicacion));
    return {
      publicaciones: publicaciones.map((publicacion) => ({
        ...serializarPublicacion(publicacion, contexto),
        esMia: publicacion.idUsuario === idUsuario,
        reportadaPorMi: reportadas.has(publicacion.idPublicacion),
      })),
      siguiente:
        filas.length > limite
          ? publicaciones[publicaciones.length - 1].idPublicacion
          : null,
    };
  }

  async publicar(red: ContextoRed, idUsuario: number, dto: PublicarVecinoDto) {
    if (red.idsUnidades.length === 0) {
      throw new ForbiddenException(
        'Solo quienes viven en la comunidad pueden publicar en el muro',
      );
    }
    const idUnidad = dto.idUnidad ?? red.idsUnidades[0];
    if (!red.idsUnidades.includes(idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const { identifiers } = await this.publicacionesRepository.insert({
      idRed: red.idRed,
      idUsuario,
      idUnidad,
      tipo: TipoPublicacion.VECINO,
      titulo: null,
      contenido: dto.contenido,
      estadoAprobacion: EstadoAprobacion.NO_REQUIERE,
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    const publicacion = await this.publicacionesRepository.findOneOrFail({
      where: { idPublicacion: identifiers[0].idPublicacion as number },
      relations: { unidad: true },
    });
    const contexto = await contextoPresentacion(
      this.dataSource.manager,
      red.idRed,
      [publicacion],
    );
    return {
      ...serializarPublicacion(publicacion, contexto),
      esMia: true,
      reportadaPorMi: false,
    };
  }

  async eliminarPropia(
    red: ContextoRed,
    idUsuario: number,
    idPublicacion: number,
  ): Promise<void> {
    const { affected } = await this.publicacionesRepository.softDelete({
      idPublicacion,
      idRed: red.idRed,
      idUsuario,
      tipo: TipoPublicacion.VECINO,
    });
    if (!affected) {
      throw new NotFoundException('Publicación no encontrada');
    }
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  async reportar(
    red: ContextoRed,
    idUsuario: number,
    idPublicacion: number,
    dto: ReportarPublicacionDto,
  ) {
    const publicacion = await this.publicacionesRepository.findOne({
      where: {
        idPublicacion,
        idRed: red.idRed,
        tipo: TipoPublicacion.VECINO,
        estadoModeracion: EstadoModeracion.PUBLICADA,
      },
    });
    if (!publicacion) {
      throw new NotFoundException('Publicación no encontrada');
    }
    if (publicacion.idUsuario === idUsuario) {
      throw new BadRequestException('No puedes reportar tu propia publicación');
    }
    const yaReportada = await this.reportesRepository.exists({
      where: {
        tipoPublicacion: LugarPublicacion.MURO,
        idPublicacion,
        idUsuario,
      },
      withDeleted: true,
    });
    if (yaReportada) {
      throw new ConflictException('Ya reportaste esta publicación');
    }
    const { identifiers } = await this.reportesRepository.insert({
      idRed: red.idRed,
      tipoPublicacion: LugarPublicacion.MURO,
      idPublicacion,
      idUsuario,
      motivo: dto.motivo,
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return { idReporte: identifiers[0].idReporte as number };
  }
}

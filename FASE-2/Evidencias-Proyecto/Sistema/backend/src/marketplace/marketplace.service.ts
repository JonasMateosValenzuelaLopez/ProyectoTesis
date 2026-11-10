import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  Repository,
} from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { ReportarPublicacionDto } from '../muro/dto/muro.dto';
import { EstadoModeracion } from '../muro/entities/muro-publicacion.entity';
import {
  LugarPublicacion,
  MuroReporte,
} from '../muro/entities/muro-reporte.entity';
import {
  idsReportadasPor,
  registrarReporte,
} from '../muro/reportes-publicacion';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import {
  EditarAvisoDto,
  PaginaAvisosDto,
  PublicarAvisoDto,
} from './dto/marketplace.dto';
import {
  MarketplacePublicacion,
  TipoAviso,
} from './entities/marketplace-publicacion.entity';
import {
  EstadoSolicitudContacto,
  MarketplaceSolicitudContacto,
} from './entities/marketplace-solicitud-contacto.entity';
import { serializarAviso } from './presentacion-marketplace';
import {
  LIMITE_POR_DEFECTO,
  MAX_AVISOS_PUBLICADOS,
} from './reglas-marketplace';
import { telefonosPorId } from './telefonos';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(MarketplacePublicacion)
    private readonly avisosRepository: Repository<MarketplacePublicacion>,
    @InjectRepository(MarketplaceSolicitudContacto)
    private readonly solicitudesRepository: Repository<MarketplaceSolicitudContacto>,
    @InjectRepository(MuroReporte)
    private readonly reportesRepository: Repository<MuroReporte>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed, idUsuario: number, filtro: PaginaAvisosDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const comun = {
      idRed: red.idRed,
      ...(filtro.tipo ? { tipo: filtro.tipo } : {}),
      ...(filtro.antesDe ? { idProducto: LessThan(filtro.antesDe) } : {}),
    };
    const filas = await this.avisosRepository.find({
      where: [
        {
          ...comun,
          estadoModeracion: EstadoModeracion.PUBLICADA,
          cerradoEn: IsNull(),
        },
        { ...comun, idUsuario },
      ],
      relations: { unidad: true },
      order: { idProducto: 'DESC' },
      take: limite + 1,
    });
    const avisos = filas.slice(0, limite);
    return {
      avisos: await this.paraUsuario(idUsuario, avisos),
      siguiente:
        filas.length > limite ? avisos[avisos.length - 1].idProducto : null,
    };
  }

  async detalle(red: ContextoRed, idUsuario: number, idProducto: number) {
    const aviso = await this.avisosRepository.findOne({
      where: [
        {
          idProducto,
          idRed: red.idRed,
          estadoModeracion: EstadoModeracion.PUBLICADA,
        },
        { idProducto, idRed: red.idRed, idUsuario },
      ],
      relations: { unidad: true },
    });
    if (!aviso) {
      throw new NotFoundException('Aviso no encontrado');
    }
    const [resultado] = await this.paraUsuario(idUsuario, [aviso]);
    return resultado;
  }

  async publicar(red: ContextoRed, idUsuario: number, dto: PublicarAvisoDto) {
    if (red.idsUnidades.length === 0) {
      throw new ForbiddenException(
        'Solo quienes viven en la comunidad pueden publicar en el mercado',
      );
    }
    const idUnidad = dto.idUnidad ?? red.idsUnidades[0];
    if (!red.idsUnidades.includes(idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const idProducto = await this.dataSource.transaction(async (manager) => {
      const autor = await this.autorBloqueado(manager, idUsuario);
      if (!autor?.telefono) {
        throw new ConflictException(
          'Agrega tu teléfono en tu perfil antes de publicar: es el dato que se comparte cuando aceptas a un vecino',
        );
      }
      const publicados = await this.disponiblesDe(manager, red, idUsuario);
      if (publicados >= MAX_AVISOS_PUBLICADOS) {
        throw new ConflictException(
          `Puedes tener hasta ${MAX_AVISOS_PUBLICADOS} avisos disponibles. Marca alguno como vendido o elimínalo para publicar otro`,
        );
      }
      const { identifiers } = await manager.insert(MarketplacePublicacion, {
        idRed: red.idRed,
        idUsuario,
        idUnidad,
        tipo: dto.tipo,
        titulo: dto.titulo,
        descripcion: dto.descripcion ?? null,
        precio: dto.tipo === TipoAviso.BUSCO ? null : (dto.precio ?? null),
      });
      return identifiers[0].idProducto as number;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idProducto);
  }

  async editar(
    red: ContextoRed,
    idUsuario: number,
    idProducto: number,
    dto: EditarAvisoDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const aviso = await this.propioBloqueado(
        manager,
        red,
        idUsuario,
        idProducto,
      );
      if (aviso.estadoModeracion !== EstadoModeracion.PUBLICADA) {
        throw new ConflictException(
          'El aviso está oculto por la administración: no puedes editarlo',
        );
      }
      if (aviso.cerradoEn) {
        throw new ConflictException('Reabre el aviso para editarlo');
      }
      const precio = dto.precio ?? null;
      if (aviso.tipo === TipoAviso.BUSCO && precio !== null) {
        throw new BadRequestException({
          message: 'Un aviso de «Busco» no lleva precio',
          campos: { precio: 'Un aviso de «Busco» no lleva precio' },
        });
      }
      await manager.update(
        MarketplacePublicacion,
        { idProducto },
        {
          titulo: dto.titulo,
          descripcion: dto.descripcion ?? null,
          precio,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idProducto);
  }

  async cerrar(red: ContextoRed, idUsuario: number, idProducto: number) {
    await this.dataSource.transaction(async (manager) => {
      const aviso = await this.propioBloqueado(
        manager,
        red,
        idUsuario,
        idProducto,
      );
      if (aviso.cerradoEn) {
        throw new ConflictException('El aviso ya está marcado como cerrado');
      }
      const ahora = new Date();
      await manager.update(
        MarketplacePublicacion,
        { idProducto },
        { cerradoEn: ahora },
      );
      await manager.update(
        MarketplaceSolicitudContacto,
        {
          idProducto,
          estado: EstadoSolicitudContacto.PENDIENTE,
          fechaEliminacion: IsNull(),
        },
        {
          estado: EstadoSolicitudContacto.RECHAZADA,
          respondidaEn: ahora,
          vista: false,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idProducto);
  }

  async reabrir(red: ContextoRed, idUsuario: number, idProducto: number) {
    await this.dataSource.transaction(async (manager) => {
      const aviso = await this.propioBloqueado(
        manager,
        red,
        idUsuario,
        idProducto,
      );
      if (!aviso.cerradoEn) {
        throw new ConflictException('El aviso no está cerrado');
      }
      await this.autorBloqueado(manager, idUsuario);
      const disponibles = await this.disponiblesDe(manager, red, idUsuario);
      if (disponibles >= MAX_AVISOS_PUBLICADOS) {
        throw new ConflictException(
          `Puedes tener hasta ${MAX_AVISOS_PUBLICADOS} avisos disponibles. Marca alguno como vendido o elimínalo para reabrir este`,
        );
      }
      await manager.update(
        MarketplacePublicacion,
        { idProducto },
        { cerradoEn: null },
      );
      await manager.update(
        MarketplaceSolicitudContacto,
        {
          idProducto,
          estado: EstadoSolicitudContacto.RECHAZADA,
          respondidaEn: aviso.cerradoEn,
          fechaEliminacion: IsNull(),
        },
        {
          estado: EstadoSolicitudContacto.PENDIENTE,
          respondidaEn: null,
          vista: false,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idProducto);
  }

  async eliminarPropio(
    red: ContextoRed,
    idUsuario: number,
    idProducto: number,
  ): Promise<void> {
    const { affected } = await this.avisosRepository.softDelete({
      idProducto,
      idRed: red.idRed,
      idUsuario,
    });
    if (!affected) {
      throw new NotFoundException('Aviso no encontrado');
    }
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  async reportar(
    red: ContextoRed,
    idUsuario: number,
    idProducto: number,
    dto: ReportarPublicacionDto,
  ) {
    const aviso = await this.avisosRepository.findOne({
      where: {
        idProducto,
        idRed: red.idRed,
        estadoModeracion: EstadoModeracion.PUBLICADA,
      },
    });
    if (!aviso) {
      throw new NotFoundException('Aviso no encontrado');
    }
    const resultado = await registrarReporte(this.reportesRepository, {
      idRed: red.idRed,
      lugar: LugarPublicacion.MARKETPLACE,
      idPublicacion: idProducto,
      idAutor: aviso.idUsuario,
      idUsuario,
      motivo: dto.motivo,
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return resultado;
  }

  private autorBloqueado(manager: EntityManager, idUsuario: number) {
    return manager.findOne(Usuario, {
      select: { idUsuario: true, telefono: true },
      where: { idUsuario },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private disponiblesDe(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
  ) {
    return manager.count(MarketplacePublicacion, {
      where: {
        idRed: red.idRed,
        idUsuario,
        estadoModeracion: EstadoModeracion.PUBLICADA,
        cerradoEn: IsNull(),
      },
    });
  }

  private async propioBloqueado(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    idProducto: number,
  ) {
    const aviso = await manager.findOne(MarketplacePublicacion, {
      where: { idProducto, idRed: red.idRed, idUsuario },
      lock: { mode: 'pessimistic_write' },
    });
    if (!aviso) {
      throw new NotFoundException('Aviso no encontrado');
    }
    return aviso;
  }

  private async paraUsuario(
    idUsuario: number,
    avisos: MarketplacePublicacion[],
  ) {
    const ids = avisos.map((a) => a.idProducto);
    const manager = this.dataSource.manager;
    const [nombres, reportadas, solicitudes] = await Promise.all([
      nombresPorId(
        manager,
        avisos.map((a) => a.idUsuario),
      ),
      idsReportadasPor(
        this.reportesRepository,
        LugarPublicacion.MARKETPLACE,
        ids,
        idUsuario,
      ),
      ids.length
        ? this.solicitudesRepository.find({
            where: { idProducto: In(ids), idUsuario },
          })
        : Promise.resolve([] as MarketplaceSolicitudContacto[]),
    ]);
    const solicitudDe = new Map(solicitudes.map((s) => [s.idProducto, s]));
    const autorDe = new Map(avisos.map((a) => [a.idProducto, a.idUsuario]));
    const telefonos = await telefonosPorId(
      manager,
      solicitudes
        .filter((s) => s.estado === EstadoSolicitudContacto.ACEPTADA)
        .map((s) => autorDe.get(s.idProducto) as number),
    );
    return avisos.map((aviso) => {
      const esMia = aviso.idUsuario === idUsuario;
      const solicitud = solicitudDe.get(aviso.idProducto);
      return {
        ...serializarAviso(aviso, nombres),
        esMia,
        reportadaPorMi: reportadas.has(aviso.idProducto),
        miSolicitud:
          esMia || !solicitud
            ? null
            : {
                idSolicitud: solicitud.idSolicitud,
                estado: solicitud.estado,
                fecha: solicitud.fechaCreacion,
                respondidaEn: solicitud.respondidaEn,
                vista: solicitud.vista,
                telefono:
                  solicitud.estado === EstadoSolicitudContacto.ACEPTADA &&
                  aviso.estadoModeracion === EstadoModeracion.PUBLICADA
                    ? (telefonos.get(aviso.idUsuario) ?? null)
                    : null,
              },
      };
    });
  }
}

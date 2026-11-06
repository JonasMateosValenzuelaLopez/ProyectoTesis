import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { EstadoModeracion } from '../muro/entities/muro-publicacion.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { PedirContactoDto, ResponderSolicitudDto } from './dto/marketplace.dto';
import { MarketplacePublicacion } from './entities/marketplace-publicacion.entity';
import {
  EstadoSolicitudContacto,
  MarketplaceSolicitudContacto,
} from './entities/marketplace-solicitud-contacto.entity';
import { persona, vivienda } from './presentacion-marketplace';
import { telefonosPorId } from './telefonos';

const MAX_SOLICITUDES_LISTADAS = 200;

const AVISO_CERRADO = 'Este aviso ya no está disponible';

const CONFLICTO_EXISTENTE: Record<EstadoSolicitudContacto, string> = {
  [EstadoSolicitudContacto.PENDIENTE]:
    'Ya le pediste contacto por este aviso. Espera su respuesta',
  [EstadoSolicitudContacto.ACEPTADA]: 'Ya tienes el contacto de este aviso',
  [EstadoSolicitudContacto.RECHAZADA]: AVISO_CERRADO,
};

@Injectable()
export class ContactosMarketplaceService {
  constructor(
    @InjectRepository(MarketplaceSolicitudContacto)
    private readonly solicitudesRepository: Repository<MarketplaceSolicitudContacto>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed, idUsuario: number) {
    const visible = {
      idRed: red.idRed,
      estadoModeracion: EstadoModeracion.PUBLICADA,
    };
    const [recibidas, enviadas] = await Promise.all([
      this.solicitudesRepository.find({
        where: { producto: { ...visible, idUsuario } },
        relations: { producto: true, unidad: true },
        order: { idSolicitud: 'DESC' },
        take: MAX_SOLICITUDES_LISTADAS,
      }),
      this.solicitudesRepository.find({
        where: { idUsuario, producto: visible },
        relations: { producto: true },
        order: { idSolicitud: 'DESC' },
        take: MAX_SOLICITUDES_LISTADAS,
      }),
    ]);
    const vigentesRecibidas = recibidas.filter((s) => s.producto);
    const vigentesEnviadas = enviadas.filter((s) => s.producto);
    const manager = this.dataSource.manager;
    const autores = vigentesEnviadas.map(
      (s) => (s.producto as MarketplacePublicacion).idUsuario,
    );
    const [nombres, telefonos] = await Promise.all([
      nombresPorId(manager, [
        ...vigentesRecibidas.map((s) => s.idUsuario),
        ...autores,
      ]),
      telefonosPorId(
        manager,
        vigentesEnviadas
          .filter((s) => s.estado === EstadoSolicitudContacto.ACEPTADA)
          .map((s) => (s.producto as MarketplacePublicacion).idUsuario),
      ),
    ]);
    return {
      recibidas: vigentesRecibidas.map((s) => this.recibida(s, nombres)),
      enviadas: vigentesEnviadas.map((s) =>
        this.enviada(s, nombres, telefonos),
      ),
    };
  }

  async pedir(
    red: ContextoRed,
    idUsuario: number,
    idProducto: number,
    dto: PedirContactoDto,
  ) {
    if (red.idsUnidades.length === 0) {
      throw new ForbiddenException(
        'Solo quienes viven en la comunidad pueden contactar avisos del mercado',
      );
    }
    const idUnidad = dto.idUnidad ?? red.idsUnidades[0];
    if (!red.idsUnidades.includes(idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const idSolicitud = await this.dataSource.transaction(async (manager) => {
      const aviso = await manager.findOne(MarketplacePublicacion, {
        where: {
          idProducto,
          idRed: red.idRed,
          estadoModeracion: EstadoModeracion.PUBLICADA,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!aviso) {
        throw new NotFoundException('Aviso no encontrado');
      }
      if (aviso.idUsuario === idUsuario) {
        throw new BadRequestException(
          'No puedes pedir contacto por tu propio aviso',
        );
      }
      if (aviso.cerradoEn) {
        throw new ConflictException(AVISO_CERRADO);
      }
      const existente = await manager.findOne(MarketplaceSolicitudContacto, {
        where: { idProducto, idUsuario },
        withDeleted: true,
      });
      if (existente && !existente.fechaEliminacion) {
        throw new ConflictException(CONFLICTO_EXISTENTE[existente.estado]);
      }
      if (existente) {
        await manager.update(
          MarketplaceSolicitudContacto,
          { idSolicitud: existente.idSolicitud },
          {
            idUnidad,
            estado: EstadoSolicitudContacto.PENDIENTE,
            respondidaEn: null,
            vista: false,
            fechaEliminacion: null,
          },
        );
        return existente.idSolicitud;
      }
      const { identifiers } = await manager.insert(
        MarketplaceSolicitudContacto,
        { idProducto, idUsuario, idUnidad },
      );
      return identifiers[0].idSolicitud as number;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    const solicitud = await this.propia(red, idUsuario, idSolicitud);
    const nombres = await nombresPorId(this.dataSource.manager, [
      (solicitud.producto as MarketplacePublicacion).idUsuario,
    ]);
    return this.enviada(solicitud, nombres, new Map());
  }

  async cancelar(
    red: ContextoRed,
    idUsuario: number,
    idSolicitud: number,
  ): Promise<void> {
    const solicitud = await this.propia(red, idUsuario, idSolicitud);
    if (solicitud.estado !== EstadoSolicitudContacto.PENDIENTE) {
      throw new ConflictException(
        'Solo puedes cancelar una solicitud que aún no tiene respuesta',
      );
    }
    const { affected } = await this.solicitudesRepository.softDelete({
      idSolicitud,
      idUsuario,
      estado: EstadoSolicitudContacto.PENDIENTE,
    });
    if (!affected) {
      throw new ConflictException(
        'Solo puedes cancelar una solicitud que aún no tiene respuesta',
      );
    }
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  async responder(
    red: ContextoRed,
    idUsuario: number,
    idSolicitud: number,
    dto: ResponderSolicitudDto,
  ) {
    const solicitud = await this.solicitudesRepository.findOne({
      where: {
        idSolicitud,
        producto: { idRed: red.idRed, idUsuario },
      },
      relations: { producto: true, unidad: true },
    });
    if (!solicitud?.producto) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (solicitud.estado !== EstadoSolicitudContacto.PENDIENTE) {
      throw new ConflictException('Esta solicitud ya fue respondida');
    }
    if (dto.aceptada) {
      const telefonos = await telefonosPorId(this.dataSource.manager, [
        idUsuario,
      ]);
      if (!telefonos.get(idUsuario)) {
        throw new ConflictException(
          'Agrega tu teléfono en tu perfil antes de aceptar: es el dato que se comparte con tu vecino',
        );
      }
    }
    const estado = dto.aceptada
      ? EstadoSolicitudContacto.ACEPTADA
      : EstadoSolicitudContacto.RECHAZADA;
    const respondidaEn = new Date();
    await this.dataSource.transaction(async (manager) => {
      const aviso = await manager.findOne(MarketplacePublicacion, {
        where: {
          idProducto: solicitud.idProducto,
          idRed: red.idRed,
          idUsuario,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!aviso) {
        throw new NotFoundException('Solicitud no encontrada');
      }
      if (aviso.estadoModeracion !== EstadoModeracion.PUBLICADA) {
        throw new ConflictException(
          'El aviso está oculto por la administración: no puedes responder solicitudes',
        );
      }
      if (aviso.cerradoEn) {
        throw new ConflictException(
          'El aviso está cerrado: reábrelo para responder solicitudes',
        );
      }
      const { affected } = await manager.update(
        MarketplaceSolicitudContacto,
        {
          idSolicitud,
          estado: EstadoSolicitudContacto.PENDIENTE,
          fechaEliminacion: IsNull(),
        },
        { estado, respondidaEn, vista: false },
      );
      if (!affected) {
        throw new ConflictException('Esta solicitud ya fue respondida');
      }
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    const nombres = await nombresPorId(this.dataSource.manager, [
      solicitud.idUsuario,
    ]);
    return this.recibida(
      { ...solicitud, estado, respondidaEn, vista: false },
      nombres,
    );
  }

  async marcarVista(
    red: ContextoRed,
    idUsuario: number,
    idSolicitud: number,
  ): Promise<void> {
    const solicitud = await this.propia(red, idUsuario, idSolicitud);
    if (solicitud.estado === EstadoSolicitudContacto.PENDIENTE) {
      throw new ConflictException('La solicitud aún no tiene respuesta');
    }
    if (solicitud.vista) {
      return;
    }
    await this.solicitudesRepository.update(
      { idSolicitud, idUsuario, fechaEliminacion: IsNull() },
      { vista: true },
    );
  }

  private async propia(
    red: ContextoRed,
    idUsuario: number,
    idSolicitud: number,
  ) {
    const solicitud = await this.solicitudesRepository.findOne({
      where: { idSolicitud, idUsuario, producto: { idRed: red.idRed } },
      relations: { producto: true },
    });
    if (!solicitud?.producto) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return solicitud;
  }

  private recibida(
    solicitud: MarketplaceSolicitudContacto,
    nombres: Map<number, string>,
  ) {
    const producto = solicitud.producto as MarketplacePublicacion;
    return {
      idSolicitud: solicitud.idSolicitud,
      estado: solicitud.estado,
      fecha: solicitud.fechaCreacion,
      respondidaEn: solicitud.respondidaEn,
      aviso: { idProducto: producto.idProducto, titulo: producto.titulo },
      interesado: persona(nombres, solicitud.idUsuario),
      unidad: vivienda(solicitud.unidad),
    };
  }

  private enviada(
    solicitud: MarketplaceSolicitudContacto,
    nombres: Map<number, string>,
    telefonos: Map<number, string | null>,
  ) {
    const producto = solicitud.producto as MarketplacePublicacion;
    return {
      idSolicitud: solicitud.idSolicitud,
      estado: solicitud.estado,
      fecha: solicitud.fechaCreacion,
      respondidaEn: solicitud.respondidaEn,
      vista: solicitud.vista,
      aviso: {
        idProducto: producto.idProducto,
        titulo: producto.titulo,
        tipo: producto.tipo,
      },
      autor: persona(nombres, producto.idUsuario),
      telefono:
        solicitud.estado === EstadoSolicitudContacto.ACEPTADA &&
        producto.estadoModeracion === EstadoModeracion.PUBLICADA
          ? (telefonos.get(producto.idUsuario) ?? null)
          : null,
    };
  }
}

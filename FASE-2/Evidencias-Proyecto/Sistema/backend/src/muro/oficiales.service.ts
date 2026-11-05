import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { DecidirDto } from '../common/dto/decidir.dto';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from '../finanzas/entities/notificacion-enviada.entity';
import {
  CorreosComunidadService,
  Destinatario,
} from '../mail/correos-comunidad.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { PublicarOficialDto } from './dto/muro.dto';
import {
  EstadoAprobacion,
  MuroPublicacion,
  TIPOS_OFICIALES,
} from './entities/muro-publicacion.entity';
import {
  contextoPresentacion,
  serializarPublicacion,
} from './presentacion-muro';

interface Aviso {
  publicacion: MuroPublicacion;
  destinatarios: Destinatario[];
  comunidad: string;
}

@Injectable()
export class OficialesService {
  constructor(
    @InjectRepository(MuroPublicacion)
    private readonly publicacionesRepository: Repository<MuroPublicacion>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly correosService: CorreosComunidadService,
  ) {}

  async listar(red: ContextoRed) {
    const publicaciones = await this.publicacionesRepository.find({
      where: { idRed: red.idRed, tipo: In(TIPOS_OFICIALES) },
      order: { idPublicacion: 'DESC' },
    });
    const contexto = await contextoPresentacion(
      this.dataSource.manager,
      red.idRed,
      publicaciones,
    );
    return publicaciones.map((p) => serializarPublicacion(p, contexto));
  }

  async publicar(red: ContextoRed, idUsuario: number, dto: PublicarOficialDto) {
    const directo = red.roles.includes(RolUsuario.PRESIDENTE);
    const { idPublicacion, aviso } = await this.dataSource.transaction(
      async (manager) => {
        const ahora = new Date();
        const { identifiers } = await manager.insert(MuroPublicacion, {
          idRed: red.idRed,
          idUsuario,
          idUnidad: null,
          tipo: dto.tipo,
          titulo: dto.titulo,
          contenido: dto.contenido,
          estadoAprobacion: directo
            ? EstadoAprobacion.APROBADA
            : EstadoAprobacion.PENDIENTE,
          aprobadoPor: directo ? idUsuario : null,
          aprobadoEn: directo ? ahora : null,
        });
        const id = identifiers[0].idPublicacion as number;
        await this.registrar(
          manager,
          red,
          idUsuario,
          directo ? 'publicar_oficial' : 'enviar_oficial_a_aprobacion',
          id,
          { tipo: dto.tipo, titulo: dto.titulo },
        );
        const aviso = directo
          ? await this.prepararAviso(manager, red, id, idUsuario)
          : null;
        return { idPublicacion: id, aviso };
      },
    );
    await this.despues(red, aviso);
    return {
      ...(await this.detalle(red, idPublicacion)),
      correos: aviso?.destinatarios.length ?? 0,
    };
  }

  async decidir(
    red: ContextoRed,
    idUsuario: number,
    idPublicacion: number,
    dto: DecidirDto,
  ) {
    const aviso = await this.dataSource.transaction(async (manager) => {
      const publicacion = await manager.findOne(MuroPublicacion, {
        where: { idPublicacion, idRed: red.idRed, tipo: In(TIPOS_OFICIALES) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!publicacion) {
        throw new NotFoundException('Publicación no encontrada');
      }
      if (publicacion.estadoAprobacion !== EstadoAprobacion.PENDIENTE) {
        throw new ConflictException(
          'Esta publicación no está esperando aprobación',
        );
      }
      await manager.update(
        MuroPublicacion,
        { idPublicacion },
        {
          estadoAprobacion: dto.aprobado
            ? EstadoAprobacion.APROBADA
            : EstadoAprobacion.RECHAZADA,
          aprobadoPor: idUsuario,
          aprobadoEn: new Date(),
        },
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        dto.aprobado ? 'aprobar_oficial' : 'rechazar_oficial',
        idPublicacion,
        { titulo: publicacion.titulo, comentario: dto.comentario ?? null },
      );
      return dto.aprobado
        ? this.prepararAviso(manager, red, idPublicacion, idUsuario)
        : null;
    });
    await this.despues(red, aviso);
    return {
      ...(await this.detalle(red, idPublicacion)),
      correos: aviso?.destinatarios.length ?? 0,
    };
  }

  async eliminar(
    red: ContextoRed,
    idUsuario: number,
    idPublicacion: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const publicacion = await manager.findOne(MuroPublicacion, {
        where: { idPublicacion, idRed: red.idRed, tipo: In(TIPOS_OFICIALES) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!publicacion) {
        throw new NotFoundException('Publicación no encontrada');
      }
      if (
        publicacion.idUsuario !== idUsuario &&
        !red.roles.includes(RolUsuario.PRESIDENTE)
      ) {
        throw new ForbiddenException('Solo puedes borrar lo que tú publicaste');
      }
      await manager.softDelete(MuroPublicacion, { idPublicacion });
      await this.registrar(
        manager,
        red,
        idUsuario,
        'eliminar_oficial',
        idPublicacion,
        {
          tipo: publicacion.tipo,
          titulo: publicacion.titulo,
          estadoAprobacion: publicacion.estadoAprobacion,
          autor: publicacion.idUsuario,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  private async prepararAviso(
    manager: EntityManager,
    red: ContextoRed,
    idPublicacion: number,
    idUsuario: number,
  ): Promise<Aviso> {
    const [publicacion, comunidad, unidades] = await Promise.all([
      manager.findOneByOrFail(MuroPublicacion, { idPublicacion }),
      manager.findOneByOrFail(RedVecinal, { idRed: red.idRed }),
      manager.find(Unidad, {
        select: { idUnidad: true },
        where: { idRed: red.idRed },
      }),
    ]);
    const destinatarios = await this.correosService.destinatarios(
      manager,
      red.idRed,
      unidades.map((unidad) => unidad.idUnidad),
    );
    await manager.insert(NotificacionEnviada, {
      idRed: red.idRed,
      tipo: TipoNotificacion.NUEVO_COMUNICADO,
      asunto: publicacion.titulo ?? publicacion.tipo,
      idPublicacion,
      destinatarios: destinatarios.length,
      enviadoPor: idUsuario,
    });
    return { publicacion, destinatarios, comunidad: comunidad.nombre };
  }

  private async despues(red: ContextoRed, aviso: Aviso | null) {
    await this.bitacoraService.marcarActividad(red.idRed);
    if (!aviso) {
      return;
    }
    const { publicacion, destinatarios, comunidad } = aviso;
    this.correosService.enviarEnSegundoPlano(
      destinatarios.map((destinatario) => ({
        para: destinatario.correo,
        asunto: `${publicacion.tipo} de ${comunidad}: ${publicacion.titulo}`,
        texto:
          `Hola ${destinatario.nombre}:\n\n` +
          `La directiva de ${comunidad} publicó ${publicacion.tipo === 'Norma' ? 'una norma' : 'un comunicado'}:\n\n` +
          `${publicacion.titulo}\n\n${publicacion.contenido}\n\n` +
          `También lo encuentras en el muro de la app EntreCasas.`,
      })),
    );
  }

  private async detalle(red: ContextoRed, idPublicacion: number) {
    const publicacion = await this.publicacionesRepository.findOneOrFail({
      where: { idPublicacion, idRed: red.idRed },
    });
    const contexto = await contextoPresentacion(
      this.dataSource.manager,
      red.idRed,
      [publicacion],
    );
    return serializarPublicacion(publicacion, contexto);
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idPublicacion: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'muro_publicaciones',
        idEntidad: idPublicacion,
        detalle,
      },
      manager,
    );
  }
}

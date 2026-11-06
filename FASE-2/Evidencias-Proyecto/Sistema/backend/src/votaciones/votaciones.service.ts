import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente, fechaHoy } from '../common/utils/vigencia';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from '../finanzas/entities/notificacion-enviada.entity';
import { fechaLegible } from '../finanzas/reglas-finanzas';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CrearVotacionDto, VotarDto } from './dto/votaciones.dto';
import { VotacionOpcion } from './entities/votacion-opcion.entity';
import { TipoVotacion, Votacion } from './entities/votacion.entity';
import { Voto } from './entities/voto.entity';
import {
  esDirectiva,
  estaAbierta,
  fechaCierre,
  finDelDia,
  resultado,
} from './reglas-votaciones';

const LIMITE_LISTA = 50;

const clave = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

@Injectable()
export class VotacionesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly correosService: CorreosComunidadService,
  ) {}

  async listar(red: ContextoRed, idUsuario: number) {
    const votaciones = await this.dataSource.manager.find(Votacion, {
      where: { idRed: red.idRed },
      order: { inicio: 'DESC', idVotacion: 'DESC' },
      take: LIMITE_LISTA,
    });
    return this.detallar(red, idUsuario, votaciones);
  }

  async crear(red: ContextoRed, idUsuario: number, dto: CrearVotacionDto) {
    this.validarOpciones(dto);
    const titulo = dto.titulo;
    const { idVotacion, destinatarios, cierre, comunidad } =
      await this.dataSource.transaction(async (manager) => {
        const comunidad = await manager.findOne(RedVecinal, {
          where: { idRed: red.idRed },
        });
        if (!comunidad) {
          throw new NotFoundException('Comunidad no encontrada');
        }
        const destinatarios = await this.titulares(manager, red.idRed);
        if (destinatarios.length === 0) {
          throw new ConflictException(
            'Ninguna vivienda tiene un titular con acceso a la app; asigna titulares antes de abrir la votación',
          );
        }
        const cierre = finDelDia(dto.fechaCierre);
        const { identifiers } = await manager.insert(Votacion, {
          idRed: red.idRed,
          titulo,
          descripcion: dto.descripcion ?? null,
          tipo: dto.tipo,
          quorumMinimo:
            dto.tipo === TipoVotacion.VOTACION ? (dto.quorum ?? null) : null,
          inicio: new Date(),
          cierre,
          creadaPor: idUsuario,
        });
        const idVotacion = identifiers[0].idVotacion as number;
        await manager.insert(
          VotacionOpcion,
          dto.opciones.map((texto, orden) => ({ idVotacion, texto, orden })),
        );
        await manager.insert(NotificacionEnviada, {
          idRed: red.idRed,
          tipo: TipoNotificacion.NUEVA_VOTACION,
          asunto: titulo,
          idVotacion,
          destinatarios: destinatarios.length,
          enviadoPor: idUsuario,
        });
        await this.registrar(
          manager,
          red,
          idUsuario,
          'crear_votacion',
          idVotacion,
          {
            tipo: dto.tipo,
            titulo,
            fechaCierre: dto.fechaCierre,
            quorum: dto.quorum ?? null,
            destinatarios: destinatarios.length,
          },
        );
        return { idVotacion, destinatarios, cierre, comunidad };
      });
    await this.bitacoraService.marcarActividad(red.idRed);
    const accion = dto.tipo === TipoVotacion.VOTACION ? 'votación' : 'encuesta';
    this.correosService.enviarEnSegundoPlano(
      destinatarios.map((destinatario) => ({
        para: destinatario.correo,
        asunto: `Nueva ${accion}: ${titulo}`,
        texto:
          `Hola ${destinatario.nombre}:\n\n` +
          `La directiva de ${comunidad.nombre} abrió una ${accion}:\n\n${titulo}\n\n` +
          `${dto.descripcion ? `${dto.descripcion}\n\n` : ''}` +
          `Como titular de tu vivienda, puedes responder en la app EntreCasas hasta el ${fechaLegible(fechaHoy(cierre))}. ` +
          `Cada vivienda vota una vez.`,
      })),
    );
    return this.detalle(red, idUsuario, idVotacion);
  }

  async cerrar(red: ContextoRed, idUsuario: number, idVotacion: number) {
    await this.dataSource.transaction(async (manager) => {
      const votacion = await this.bloquear(manager, red, idVotacion);
      if (!estaAbierta(votacion)) {
        throw new ConflictException('La votación ya está cerrada');
      }
      await manager.update(Votacion, { idVotacion }, { cerradaEn: new Date() });
      await this.registrar(
        manager,
        red,
        idUsuario,
        'cerrar_votacion',
        idVotacion,
        {
          titulo: votacion.titulo,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idVotacion);
  }

  async recordar(red: ContextoRed, idUsuario: number, idVotacion: number) {
    const { votacion, destinatarios } = await this.dataSource.transaction(
      async (manager) => {
        const votacion = await this.bloquear(manager, red, idVotacion);
        if (!estaAbierta(votacion)) {
          throw new ConflictException('La votación ya está cerrada');
        }
        const votaron = new Set(
          (
            await manager.find(Voto, {
              select: { idUnidad: true },
              where: { idVotacion },
            })
          ).map((voto) => voto.idUnidad),
        );
        const unidades = await manager.find(Unidad, {
          select: { idUnidad: true },
          where: { idRed: red.idRed },
        });
        const faltan = unidades
          .map((unidad) => unidad.idUnidad)
          .filter((id) => !votaron.has(id));
        if (faltan.length === 0) {
          throw new ConflictException('Todas las viviendas ya votaron');
        }
        const destinatarios = await this.correosService.destinatarios(
          manager,
          red.idRed,
          faltan,
          { soloTitulares: true },
        );
        if (destinatarios.length === 0) {
          throw new ConflictException(
            'Ninguna de las viviendas que faltan por votar tiene un titular con acceso a la app',
          );
        }
        await manager.insert(NotificacionEnviada, {
          idRed: red.idRed,
          tipo: TipoNotificacion.RECORDATORIO_VOTACION,
          asunto: votacion.titulo,
          idVotacion,
          destinatarios: destinatarios.length,
          enviadoPor: idUsuario,
        });
        await this.registrar(
          manager,
          red,
          idUsuario,
          'recordar_votacion',
          idVotacion,
          {
            titulo: votacion.titulo,
            destinatarios: destinatarios.length,
          },
        );
        return { votacion, destinatarios };
      },
    );
    await this.bitacoraService.marcarActividad(red.idRed);
    const correosEnviados = await this.correosService.enviar(
      destinatarios.map((destinatario) => ({
        para: destinatario.correo,
        asunto: `Recordatorio: ${votacion.titulo}`,
        texto:
          `Hola ${destinatario.nombre}:\n\n` +
          `Tu vivienda aún no responde «${votacion.titulo}». ` +
          `Puedes hacerlo en la app EntreCasas hasta el ${fechaLegible(fechaCierre(votacion))}.`,
      })),
    );
    return { destinatarios: destinatarios.length, correosEnviados };
  }

  async votar(
    red: ContextoRed,
    idUsuario: number,
    idVotacion: number,
    dto: VotarDto,
  ) {
    if (!red.idsUnidades.includes(dto.idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    await this.dataSource.transaction(async (manager) => {
      const votacion = await this.bloquear(manager, red, idVotacion);
      if (!estaAbierta(votacion)) {
        throw new ConflictException('La votación ya está cerrada');
      }
      const opcion = await manager.findOne(VotacionOpcion, {
        where: { idOpcion: dto.idOpcion, idVotacion },
      });
      if (!opcion) {
        throw new BadRequestException('La opción no es de esta votación');
      }
      const esTitular = await manager.exists(Residencia, {
        where: {
          idUsuario,
          idUnidad: dto.idUnidad,
          titular: 1,
          ...condicionVigente(),
        },
      });
      if (!esTitular) {
        throw new ForbiddenException(
          'Solo el titular de la vivienda puede votar',
        );
      }
      const yaVoto = await manager.exists(Voto, {
        where: { idVotacion, idUnidad: dto.idUnidad },
      });
      if (yaVoto) {
        throw new ConflictException('Tu vivienda ya votó');
      }
      await manager.insert(Voto, {
        idVotacion,
        idOpcion: dto.idOpcion,
        idUnidad: dto.idUnidad,
        idUsuario,
      });
      await this.registrar(manager, red, idUsuario, 'votar', idVotacion, {
        titulo: votacion.titulo,
        idUnidad: dto.idUnidad,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idVotacion);
  }

  private validarOpciones(dto: CrearVotacionDto) {
    const claves = dto.opciones.map(clave);
    if (new Set(claves).size !== claves.length) {
      throw new BadRequestException('Hay opciones repetidas');
    }
  }

  private titulares(manager: EntityManager, idRed: number) {
    return manager
      .find(Unidad, { select: { idUnidad: true }, where: { idRed } })
      .then((unidades) =>
        this.correosService.destinatarios(
          manager,
          idRed,
          unidades.map((unidad) => unidad.idUnidad),
          { soloTitulares: true },
        ),
      );
  }

  private async bloquear(
    manager: EntityManager,
    red: ContextoRed,
    idVotacion: number,
  ) {
    const votacion = await manager.findOne(Votacion, {
      where: { idVotacion, idRed: red.idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!votacion) {
      throw new NotFoundException('Votación no encontrada');
    }
    return votacion;
  }

  private async detalle(
    red: ContextoRed,
    idUsuario: number,
    idVotacion: number,
  ) {
    const votacion = await this.dataSource.manager.findOne(Votacion, {
      where: { idVotacion, idRed: red.idRed },
    });
    if (!votacion) {
      throw new NotFoundException('Votación no encontrada');
    }
    const [detalle] = await this.detallar(red, idUsuario, [votacion]);
    return detalle;
  }

  private async detallar(
    red: ContextoRed,
    idUsuario: number,
    votaciones: Votacion[],
  ) {
    if (votaciones.length === 0) {
      return [];
    }
    const manager = this.dataSource.manager;
    const ids = votaciones.map((votacion) => votacion.idVotacion);
    const directiva = esDirectiva(red);
    const [
      opciones,
      votos,
      totalUnidades,
      titularidades,
      recordatorios,
      titulares,
      conAcceso,
    ] = await Promise.all([
      manager.find(VotacionOpcion, {
        where: { idVotacion: In(ids) },
        order: { orden: 'ASC', idOpcion: 'ASC' },
      }),
      manager.find(Voto, {
        select: { idVotacion: true, idOpcion: true, idUnidad: true },
        where: { idVotacion: In(ids) },
      }),
      manager.count(Unidad, { where: { idRed: red.idRed } }),
      red.idsUnidades.length
        ? manager.find(Residencia, {
            select: { idUnidad: true },
            where: {
              idUsuario,
              idUnidad: In(red.idsUnidades),
              titular: 1,
              ...condicionVigente(),
            },
          })
        : Promise.resolve([]),
      directiva
        ? manager.find(NotificacionEnviada, {
            select: { idVotacion: true },
            where: {
              idVotacion: In(ids),
              tipo: TipoNotificacion.RECORDATORIO_VOTACION,
            },
          })
        : Promise.resolve([]),
      directiva
        ? manager.find(Residencia, {
            select: { idUsuario: true },
            where: {
              unidad: { idRed: red.idRed },
              titular: 1,
              ...condicionVigente(),
            },
          })
        : Promise.resolve([]),
      directiva
        ? manager.find(Membresia, {
            select: { idUsuario: true },
            where: { idRed: red.idRed, activo: true, ...condicionVigente() },
          })
        : Promise.resolve([]),
    ]);
    const usuariosConAcceso = new Set(conAcceso.map((m) => m.idUsuario));
    const conTitular = titulares.filter((r) =>
      usuariosConAcceso.has(r.idUsuario),
    ).length;
    const misUnidades = new Set(red.idsUnidades);
    const unidadesTitular = titularidades.map((r) => r.idUnidad);
    return votaciones.map((votacion) => {
      const deEsta = votos.filter((v) => v.idVotacion === votacion.idVotacion);
      const conteos = opciones
        .filter((o) => o.idVotacion === votacion.idVotacion)
        .map((o) => ({
          idOpcion: o.idOpcion,
          texto: o.texto,
          votos: deEsta.filter((v) => v.idOpcion === o.idOpcion).length,
        }));
      const misVotos = deEsta
        .filter((v) => misUnidades.has(v.idUnidad))
        .map((v) => ({ idUnidad: v.idUnidad, idOpcion: v.idOpcion }));
      const abierta = estaAbierta(votacion);
      const verResultados = directiva || !abierta || misVotos.length > 0;
      const calculo = resultado(conteos, totalUnidades, votacion.quorumMinimo);
      return {
        idVotacion: votacion.idVotacion,
        tipo: votacion.tipo,
        titulo: votacion.titulo,
        descripcion: votacion.descripcion,
        quorum: votacion.quorumMinimo,
        inicio: votacion.inicio,
        fechaCierre: fechaCierre(votacion),
        estado: abierta ? 'Abierta' : 'Cerrada',
        totalUnidades,
        opciones: conteos.map(({ idOpcion, texto, votos: n }) => ({
          idOpcion,
          texto,
          votos: verResultados ? n : null,
        })),
        resultado: verResultados
          ? {
              votos: calculo.votos,
              participacion: calculo.participacion,
              faltan: calculo.faltan,
              alcanzaQuorum: calculo.alcanzaQuorum,
              idOpcionGanadora: abierta ? null : calculo.idOpcionGanadora,
            }
          : null,
        misVotos,
        puedeVotarPor: abierta
          ? unidadesTitular.filter(
              (id) => !misVotos.some((voto) => voto.idUnidad === id),
            )
          : [],
        ...(directiva
          ? {
              recordatorios: recordatorios.filter(
                (r) => r.idVotacion === votacion.idVotacion,
              ).length,
              unidadesSinTitular: totalUnidades - conTitular,
            }
          : {}),
      };
    });
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idVotacion: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'votaciones',
        idEntidad: idVotacion,
        detalle,
      },
      manager,
    );
  }
}

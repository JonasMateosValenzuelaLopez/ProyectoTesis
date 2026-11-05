import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { DecidirDto } from '../common/dto/decidir.dto';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { SolicitarExencionDto } from './dto/egresos-exenciones.dto';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { EstadoExencion, Exencion } from './entities/exencion.entity';

const EN_CURSO = [EstadoExencion.PENDIENTE, EstadoExencion.POR_APROBAR];

@Injectable()
export class ExencionesService {
  constructor(
    @InjectRepository(Exencion)
    private readonly exencionesRepository: Repository<Exencion>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const exenciones = await this.exencionesRepository.find({
      where: { cobroUnidad: { cobro: { idRed: red.idRed } } },
      relations: { cobroUnidad: { cobro: true, unidad: true } },
      order: { idExencion: 'DESC' },
    });
    const nombre = await nombresPorId(
      this.dataSource.manager,
      exenciones.flatMap((e) => [
        e.solicitadaPor,
        e.revisadaPor,
        e.resueltaPor,
      ]),
    );
    return exenciones.map((exencion) => this.serializar(exencion, nombre));
  }

  async solicitarComoResidente(
    red: ContextoRed,
    idUsuario: number,
    dto: SolicitarExencionDto,
  ) {
    return this.solicitar(red, idUsuario, dto, false);
  }

  async solicitarComoTesoreria(
    red: ContextoRed,
    idUsuario: number,
    dto: SolicitarExencionDto,
  ) {
    return this.solicitar(red, idUsuario, dto, true);
  }

  async revisar(
    red: ContextoRed,
    idUsuario: number,
    idExencion: number,
    dto: DecidirDto,
  ) {
    await this.decidir(
      red,
      idUsuario,
      idExencion,
      async (manager, exencion) => {
        if (exencion.estado !== EstadoExencion.PENDIENTE) {
          throw new ConflictException(
            'Esta exención no está esperando la revisión de Tesorería',
          );
        }
        const ahora = new Date();
        await manager.update(
          Exencion,
          { idExencion },
          dto.aprobado
            ? {
                estado: EstadoExencion.POR_APROBAR,
                revisadaPor: idUsuario,
                revisadaEn: ahora,
              }
            : {
                estado: EstadoExencion.RECHAZADA,
                revisadaPor: idUsuario,
                revisadaEn: ahora,
                resueltaPor: idUsuario,
                resueltaEn: ahora,
                comentarioResolucion: dto.comentario ?? null,
              },
        );
        return dto.aprobado ? 'aceptar_exencion' : 'rechazar_exencion';
      },
      dto.comentario,
    );
    return this.detalle(red, idExencion);
  }

  async resolver(
    red: ContextoRed,
    idUsuario: number,
    idExencion: number,
    dto: DecidirDto,
  ) {
    await this.decidir(
      red,
      idUsuario,
      idExencion,
      async (manager, exencion) => {
        if (exencion.estado !== EstadoExencion.POR_APROBAR) {
          throw new ConflictException(
            'Esta exención no está esperando la decisión de la Presidencia',
          );
        }
        if (dto.aprobado) {
          const fila = await manager.findOne(CobroUnidad, {
            where: { idCobroUnidad: exencion.idCobroUnidad },
            lock: { mode: 'pessimistic_write' },
          });
          if (fila?.estado !== EstadoCobroUnidad.PENDIENTE) {
            throw new ConflictException(
              'El cobro ya no está pendiente: no se puede eximir',
            );
          }
          await manager.update(
            CobroUnidad,
            { idCobroUnidad: exencion.idCobroUnidad },
            { estado: EstadoCobroUnidad.EXENTO },
          );
        }
        await manager.update(
          Exencion,
          { idExencion },
          {
            estado: dto.aprobado
              ? EstadoExencion.APROBADA
              : EstadoExencion.RECHAZADA,
            resueltaPor: idUsuario,
            resueltaEn: new Date(),
            comentarioResolucion: dto.comentario ?? null,
          },
        );
        return dto.aprobado ? 'aprobar_exencion' : 'rechazar_exencion';
      },
      dto.comentario,
    );
    return this.detalle(red, idExencion);
  }

  private async solicitar(
    red: ContextoRed,
    idUsuario: number,
    dto: SolicitarExencionDto,
    desdeTesoreria: boolean,
  ) {
    const idExencion = await this.dataSource.transaction(async (manager) => {
      const fila = await manager.findOne(CobroUnidad, {
        where: {
          idCobroUnidad: dto.idCobroUnidad,
          cobro: { idRed: red.idRed },
        },
        relations: { cobro: true },
      });
      const propia =
        fila && (desdeTesoreria || red.idsUnidades.includes(fila.idUnidad));
      if (!propia) {
        throw new NotFoundException('Cobro no encontrado');
      }
      await manager.findOne(CobroUnidad, {
        where: { idCobroUnidad: fila.idCobroUnidad },
        lock: { mode: 'pessimistic_write' },
      });
      if (fila.estado !== EstadoCobroUnidad.PENDIENTE) {
        throw new ConflictException(
          'Solo se puede pedir exención de un cobro pendiente',
        );
      }
      const enCurso = await manager.exists(Exencion, {
        where: { idCobroUnidad: fila.idCobroUnidad, estado: In(EN_CURSO) },
      });
      if (enCurso) {
        throw new ConflictException(
          'Este cobro ya tiene una exención en revisión',
        );
      }
      const ahora = new Date();
      const { identifiers } = await manager.insert(Exencion, {
        idCobroUnidad: fila.idCobroUnidad,
        motivo: dto.motivo,
        solicitadaPor: idUsuario,
        ...(desdeTesoreria
          ? {
              estado: EstadoExencion.POR_APROBAR,
              revisadaPor: idUsuario,
              revisadaEn: ahora,
            }
          : { estado: EstadoExencion.PENDIENTE }),
      });
      const id = identifiers[0].idExencion as number;
      await this.registrar(manager, red, idUsuario, 'solicitar_exencion', id, {
        idCobroUnidad: fila.idCobroUnidad,
        idUnidad: fila.idUnidad,
        concepto: fila.cobro.concepto,
        motivo: dto.motivo,
        desdeTesoreria,
      });
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idExencion);
  }

  private async decidir(
    red: ContextoRed,
    idUsuario: number,
    idExencion: number,
    aplicar: (manager: EntityManager, exencion: Exencion) => Promise<string>,
    comentario?: string,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const exencion = await this.bloquear(manager, red, idExencion);
      const accion = await aplicar(manager, exencion);
      await this.registrar(manager, red, idUsuario, accion, idExencion, {
        idCobroUnidad: exencion.idCobroUnidad,
        comentario: comentario ?? null,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  private async bloquear(
    manager: EntityManager,
    red: ContextoRed,
    idExencion: number,
  ) {
    const exencion = await manager.findOne(Exencion, {
      where: { idExencion },
      lock: { mode: 'pessimistic_write' },
    });
    const deLaRed =
      exencion &&
      (await manager.exists(CobroUnidad, {
        where: {
          idCobroUnidad: exencion.idCobroUnidad,
          cobro: { idRed: red.idRed },
        },
      }));
    if (!deLaRed) {
      throw new NotFoundException('Exención no encontrada');
    }
    return exencion;
  }

  private async detalle(red: ContextoRed, idExencion: number) {
    const exencion = await this.exencionesRepository.findOne({
      where: { idExencion, cobroUnidad: { cobro: { idRed: red.idRed } } },
      relations: { cobroUnidad: { cobro: true, unidad: true } },
    });
    if (!exencion) {
      throw new NotFoundException('Exención no encontrada');
    }
    return this.serializar(
      exencion,
      await nombresPorId(this.dataSource.manager, [
        exencion.solicitadaPor,
        exencion.revisadaPor,
        exencion.resueltaPor,
      ]),
    );
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idExencion: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'exenciones',
        idEntidad: idExencion,
        detalle,
      },
      manager,
    );
  }

  private serializar(exencion: Exencion, nombre: Map<number, string>) {
    const persona = (id: number | null) =>
      id === null ? null : { idUsuario: id, nombre: nombre.get(id) ?? null };
    const fila = exencion.cobroUnidad;
    return {
      idExencion: exencion.idExencion,
      idCobroUnidad: exencion.idCobroUnidad,
      unidad: fila?.unidad
        ? {
            idUnidad: fila.unidad.idUnidad,
            numeroIdentificador: fila.unidad.numeroIdentificador,
          }
        : null,
      concepto: fila?.cobro?.concepto ?? null,
      monto: fila?.monto ?? null,
      motivo: exencion.motivo,
      estado: exencion.estado,
      solicitadaPor: persona(exencion.solicitadaPor),
      fechaSolicitud: exencion.fechaCreacion,
      revisadaPor: persona(exencion.revisadaPor),
      revisadaEn: exencion.revisadaEn,
      resueltaPor: persona(exencion.resueltaPor),
      resueltaEn: exencion.resueltaEn,
      comentarioResolucion: exencion.comentarioResolucion,
    };
  }
}

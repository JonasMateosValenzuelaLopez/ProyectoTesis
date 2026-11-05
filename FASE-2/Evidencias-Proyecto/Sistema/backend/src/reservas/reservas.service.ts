import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DataSource,
  EntityManager,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Not,
} from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaHoy } from '../common/utils/vigencia';
import { fechaLegible } from '../finanzas/reglas-finanzas';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { CancelacionesService } from './cancelaciones.service';
import {
  CancelarReservaDto,
  CrearReservaDto,
  DisponibilidadDto,
  ListarReservasDto,
  RecibirEspacioDto,
} from './dto/reservas.dto';
import { EspacioComun } from './entities/espacio-comun.entity';
import { ReservaBloque } from './entities/reserva-bloque.entity';
import {
  ESTADOS_ACTIVOS,
  EstadoReserva,
  Reserva,
} from './entities/reserva.entity';
import {
  estadoVisible,
  HORAS_PARA_CANCELAR,
  MAX_BLOQUES_POR_DIA,
  OBSERVACION_SIN_NOVEDADES,
  puedeCancelarResidente,
  seCruzan,
  ultimoDiaReservable,
  yaEmpezo,
} from './reglas-reservas';

const MAX_MIS_RESERVAS = 100;

@Injectable()
export class ReservasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly cancelacionesService: CancelacionesService,
  ) {}

  async disponibilidad(red: ContextoRed, filtro: DisponibilidadDto) {
    this.validarFecha(filtro.fecha);
    const manager = this.dataSource.manager;
    const espacio = await this.espacioActivo(manager, red, filtro.idEspacio);
    const [bloques, reservas] = await Promise.all([
      manager.find(ReservaBloque, {
        where: { idEspacio: espacio.idEspacio },
        order: { horaInicio: 'ASC' },
      }),
      manager.find(Reserva, {
        where: {
          idEspacio: espacio.idEspacio,
          fechaReserva: filtro.fecha,
          estadoReserva: In(ESTADOS_ACTIVOS),
        },
      }),
    ]);
    return {
      idEspacio: espacio.idEspacio,
      fecha: filtro.fecha,
      bloques: bloques.map((bloque) => ({
        idBloque: bloque.idBloque,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
        estado: reservas.some((reserva) => seCruzan(reserva, bloque))
          ? 'Reservado'
          : yaEmpezo({
                fechaReserva: filtro.fecha,
                horaInicio: bloque.horaInicio,
              })
            ? 'Pasado'
            : 'Libre',
      })),
    };
  }

  async mias(red: ContextoRed) {
    if (red.idsUnidades.length === 0) {
      return [];
    }
    const manager = this.dataSource.manager;
    const reservas = await manager.find(Reserva, {
      where: { idRed: red.idRed, idUnidad: In(red.idsUnidades) },
      relations: { espacio: true, unidad: true },
      order: { fechaReserva: 'DESC', horaInicio: 'DESC' },
      take: MAX_MIS_RESERVAS,
    });
    const nombres = await nombresPorId(
      manager,
      reservas.map((reserva) => reserva.idUsuario),
    );
    const ahora = new Date();
    return reservas.map((reserva) => ({
      ...this.serializar(reserva, nombres),
      puedeCancelar: puedeCancelarResidente(reserva, ahora),
    }));
  }

  async crear(red: ContextoRed, idUsuario: number, dto: CrearReservaDto) {
    if (!red.idsUnidades.includes(dto.idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    this.validarFecha(dto.fecha);
    const idReserva = await this.dataSource.transaction(async (manager) => {
      const espacio = await this.espacioActivo(
        manager,
        red,
        dto.idEspacio,
        true,
      );
      const bloque = await manager.findOne(ReservaBloque, {
        where: { idEspacio: espacio.idEspacio, horaInicio: dto.horaInicio },
      });
      if (!bloque) {
        throw new BadRequestException('Ese horario no existe en este espacio');
      }
      if (
        yaEmpezo({ fechaReserva: dto.fecha, horaInicio: bloque.horaInicio })
      ) {
        throw new BadRequestException('Ese horario ya pasó');
      }
      const invitados = dto.invitados ?? 0;
      if (espacio.capacidad !== null && invitados > espacio.capacidad) {
        throw new BadRequestException(
          `${espacio.nombre} admite hasta ${espacio.capacidad} personas`,
        );
      }
      const delDia = await manager.find(Reserva, {
        where: {
          idEspacio: espacio.idEspacio,
          fechaReserva: dto.fecha,
          estadoReserva: In(ESTADOS_ACTIVOS),
        },
      });
      if (delDia.some((reserva) => seCruzan(reserva, bloque))) {
        throw new ConflictException('Ese horario ya está reservado');
      }
      const deLaUnidad = delDia.filter(
        (reserva) => reserva.idUnidad === dto.idUnidad,
      ).length;
      if (deLaUnidad >= MAX_BLOQUES_POR_DIA) {
        throw new ConflictException(
          `Tu vivienda ya tiene ${MAX_BLOQUES_POR_DIA} horarios de ${espacio.nombre} ese día`,
        );
      }
      const { identifiers } = await manager.insert(Reserva, {
        idRed: red.idRed,
        idEspacio: espacio.idEspacio,
        idUsuario,
        idUnidad: dto.idUnidad,
        fechaReserva: dto.fecha,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
        invitados,
        estadoReserva: EstadoReserva.APROBADA,
      });
      const id = identifiers[0].idReserva as number;
      await this.registrar(manager, red, idUsuario, 'crear_reserva', id, {
        espacio: espacio.nombre,
        fecha: dto.fecha,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
        idUnidad: dto.idUnidad,
      });
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idReserva);
  }

  async cancelarPropia(red: ContextoRed, idUsuario: number, idReserva: number) {
    if (red.idsUnidades.length === 0) {
      throw new NotFoundException('Reserva no encontrada');
    }
    await this.dataSource.transaction(async (manager) => {
      const reserva = await this.bloquear(manager, red, idReserva, {
        idUnidad: In(red.idsUnidades),
      });
      this.exigirActiva(reserva);
      if (!puedeCancelarResidente(reserva)) {
        throw new ConflictException(
          `Solo puedes cancelar hasta ${HORAS_PARA_CANCELAR} horas antes. Si necesitas cancelarla, habla con la administración.`,
        );
      }
      await manager.update(
        Reserva,
        { idReserva },
        { estadoReserva: EstadoReserva.CANCELADA },
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        'cancelar_reserva',
        idReserva,
        {
          espacio: reserva.espacio.nombre,
          fecha: reserva.fechaReserva,
          horaInicio: reserva.horaInicio,
          porResidente: true,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idReserva);
  }

  async listar(red: ContextoRed, filtro: ListarReservasDto) {
    const manager = this.dataSource.manager;
    const reservas = await manager.find(Reserva, {
      where: {
        idRed: red.idRed,
        fechaReserva: MoreThanOrEqual(fechaHoy()),
        ...(filtro.idEspacio ? { idEspacio: filtro.idEspacio } : {}),
      },
      relations: { espacio: true, unidad: true },
      order: { fechaReserva: 'ASC', horaInicio: 'ASC', idReserva: 'ASC' },
    });
    const nombres = await nombresPorId(
      manager,
      reservas.map((reserva) => reserva.idUsuario),
    );
    return reservas.map((reserva) => this.serializar(reserva, nombres));
  }

  async cancelarPorAdministracion(
    red: ContextoRed,
    idUsuario: number,
    idReserva: number,
    dto: CancelarReservaDto,
  ) {
    const { correos } = await this.dataSource.transaction(async (manager) => {
      const reserva = await this.bloquear(manager, red, idReserva);
      this.exigirActiva(reserva);
      if (reserva.entregadoEn) {
        throw new ConflictException(
          'El espacio ya se entregó; no se puede cancelar la reserva',
        );
      }
      if (yaEmpezo(reserva)) {
        throw new ConflictException('La reserva ya empezó');
      }
      const resultado = await this.cancelacionesService.cancelar(
        manager,
        red.idRed,
        [reserva],
        () => reserva.espacio.nombre,
        dto.motivo,
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        'cancelar_reserva',
        idReserva,
        {
          espacio: reserva.espacio.nombre,
          fecha: reserva.fechaReserva,
          horaInicio: reserva.horaInicio,
          motivo: dto.motivo,
          porAdministracion: true,
          residentesAvisados: resultado.correos.length,
        },
      );
      return resultado;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    this.cancelacionesService.enviar(correos);
    return {
      ...(await this.detalle(red, idReserva)),
      residentesAvisados: correos.length,
    };
  }

  async delDia(red: ContextoRed) {
    const manager = this.dataSource.manager;
    const hoy = fechaHoy();
    const activa = { idRed: red.idRed, estadoReserva: In(ESTADOS_ACTIVOS) };
    const [activos, reservas] = await Promise.all([
      manager.find(EspacioComun, {
        where: { idRed: red.idRed, estado: true },
        order: { idEspacio: 'ASC' },
      }),
      manager.find(Reserva, {
        where: [
          { ...activa, fechaReserva: hoy },
          {
            ...activa,
            fechaReserva: LessThan(hoy),
            entregadoEn: Not(IsNull()),
            recibidoEn: IsNull(),
          },
        ],
        relations: { espacio: true, unidad: true },
        order: { fechaReserva: 'ASC', horaInicio: 'ASC' },
      }),
    ]);
    const espacios = [...activos];
    for (const reserva of reservas) {
      if (!espacios.some((e) => e.idEspacio === reserva.idEspacio)) {
        espacios.push(reserva.espacio);
      }
    }
    const nombres = await nombresPorId(
      manager,
      reservas.map((reserva) => reserva.idUsuario),
    );
    return {
      fecha: hoy,
      espacios: espacios.map((espacio) => {
        const delEspacio = reservas.filter(
          (reserva) => reserva.idEspacio === espacio.idEspacio,
        );
        return {
          idEspacio: espacio.idEspacio,
          nombre: espacio.nombre,
          activo: Boolean(espacio.estado),
          enUso:
            delEspacio.find(
              (reserva) =>
                reserva.fechaReserva === hoy &&
                reserva.entregadoEn &&
                !reserva.recibidoEn,
            )?.idReserva ?? null,
          reservas: delEspacio
            .filter((reserva) => reserva.fechaReserva === hoy)
            .map((reserva) => this.serializar(reserva, nombres)),
          porRecibir: delEspacio
            .filter((reserva) => reserva.fechaReserva < hoy)
            .map((reserva) => this.serializar(reserva, nombres)),
        };
      }),
    };
  }

  async entregar(red: ContextoRed, idUsuario: number, idReserva: number) {
    await this.dataSource.transaction(async (manager) => {
      const reserva = await this.bloquear(manager, red, idReserva);
      if (reserva.fechaReserva !== fechaHoy()) {
        throw new ConflictException('Solo se entregan las reservas de hoy');
      }
      if (
        reserva.estadoReserva !== EstadoReserva.APROBADA ||
        reserva.entregadoEn
      ) {
        throw new ConflictException('Esta reserva no se puede entregar');
      }
      await manager.findOne(EspacioComun, {
        where: { idEspacio: reserva.idEspacio },
        lock: { mode: 'pessimistic_write' },
      });
      const enUso = await manager.findOne(Reserva, {
        where: {
          idEspacio: reserva.idEspacio,
          fechaReserva: reserva.fechaReserva,
          idReserva: Not(idReserva),
          entregadoEn: Not(IsNull()),
          recibidoEn: IsNull(),
        },
      });
      if (enUso) {
        throw new ConflictException(
          `${reserva.espacio.nombre} sigue en uso: recíbelo antes de entregarlo de nuevo`,
        );
      }
      await manager.update(
        Reserva,
        { idReserva },
        { entregadoEn: new Date(), entregadoPor: idUsuario },
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        'entregar_espacio',
        idReserva,
        {
          espacio: reserva.espacio.nombre,
          idUnidad: reserva.idUnidad,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idReserva);
  }

  async recibir(
    red: ContextoRed,
    idUsuario: number,
    idReserva: number,
    dto: RecibirEspacioDto,
  ) {
    const observaciones = dto.observaciones ?? OBSERVACION_SIN_NOVEDADES;
    await this.dataSource.transaction(async (manager) => {
      const reserva = await this.bloquear(manager, red, idReserva);
      if (!reserva.entregadoEn || reserva.recibidoEn) {
        throw new ConflictException('Este espacio no está entregado');
      }
      await manager.update(
        Reserva,
        { idReserva },
        {
          recibidoEn: new Date(),
          recibidoPor: idUsuario,
          observacionesRecepcion: observaciones,
        },
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        'recibir_espacio',
        idReserva,
        {
          espacio: reserva.espacio.nombre,
          idUnidad: reserva.idUnidad,
          observaciones,
          conObservaciones: observaciones !== OBSERVACION_SIN_NOVEDADES,
        },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idReserva);
  }

  private validarFecha(fecha: string) {
    const hoy = fechaHoy();
    const ultimo = ultimoDiaReservable(hoy);
    if (fecha < hoy || fecha > ultimo) {
      throw new BadRequestException(
        `Puedes reservar desde hoy hasta el ${fechaLegible(ultimo)}`,
      );
    }
  }

  private async espacioActivo(
    manager: EntityManager,
    red: ContextoRed,
    idEspacio: number,
    bloquear = false,
  ) {
    const espacio = await manager.findOne(EspacioComun, {
      where: { idEspacio, idRed: red.idRed, estado: true },
      ...(bloquear ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
    if (!espacio) {
      throw new NotFoundException('Espacio no encontrado');
    }
    return espacio;
  }

  private async bloquear(
    manager: EntityManager,
    red: ContextoRed,
    idReserva: number,
    filtro: { idUnidad?: ReturnType<typeof In<number>> } = {},
  ) {
    const reserva = await manager.findOne(Reserva, {
      where: { idReserva, idRed: red.idRed, ...filtro },
      lock: { mode: 'pessimistic_write' },
    });
    if (!reserva) {
      throw new NotFoundException('Reserva no encontrada');
    }
    reserva.espacio = await manager.findOneOrFail(EspacioComun, {
      where: { idEspacio: reserva.idEspacio },
    });
    return reserva;
  }

  private exigirActiva(reserva: Reserva) {
    if (!ESTADOS_ACTIVOS.includes(reserva.estadoReserva)) {
      throw new ConflictException('La reserva ya no está vigente');
    }
  }

  private async detalle(red: ContextoRed, idReserva: number) {
    const manager = this.dataSource.manager;
    const reserva = await manager.findOneOrFail(Reserva, {
      where: { idReserva, idRed: red.idRed },
      relations: { espacio: true, unidad: true },
    });
    const nombres = await nombresPorId(manager, [reserva.idUsuario]);
    return this.serializar(reserva, nombres);
  }

  private serializar(reserva: Reserva, nombres: Map<number, string>) {
    return {
      idReserva: reserva.idReserva,
      idEspacio: reserva.idEspacio,
      espacio: reserva.espacio?.nombre ?? null,
      idUnidad: reserva.idUnidad,
      unidad: reserva.unidad
        ? {
            idUnidad: reserva.unidad.idUnidad,
            numeroIdentificador: reserva.unidad.numeroIdentificador,
            torre: reserva.unidad.torre,
            callePasaje: reserva.unidad.callePasaje,
          }
        : null,
      usuario: {
        idUsuario: reserva.idUsuario,
        nombre: nombres.get(reserva.idUsuario) ?? null,
      },
      fecha: reserva.fechaReserva,
      horaInicio: reserva.horaInicio,
      horaFin: reserva.horaFin,
      invitados: reserva.invitados ?? 0,
      estado: estadoVisible(reserva),
      motivoCancelacion: reserva.motivoCancelacion,
      observacionesRecepcion: reserva.observacionesRecepcion,
      entregadoEn: reserva.entregadoEn,
      recibidoEn: reserva.recibidoEn,
      fechaSolicitud: reserva.fechaSolicitud,
    };
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idReserva: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'reservas',
        idEntidad: idReserva,
        detalle,
      },
      manager,
    );
  }
}

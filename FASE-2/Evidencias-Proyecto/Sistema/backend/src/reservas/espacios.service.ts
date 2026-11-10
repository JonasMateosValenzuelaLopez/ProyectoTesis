import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull, MoreThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaHoy, horaActual } from '../common/utils/vigencia';
import { CorreoSaliente } from '../mail/mail.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { CancelacionesService } from './cancelaciones.service';
import { BloqueDto, EspacioDto, GuardarEspaciosDto } from './dto/reservas.dto';
import { EspacioComun } from './entities/espacio-comun.entity';
import { ReservaBloque } from './entities/reserva-bloque.entity';
import { ESTADOS_ACTIVOS, Reserva } from './entities/reserva.entity';
import { MOTIVO_BAJA, MOTIVO_HORARIO, seCruzan } from './reglas-reservas';

const clave = (nombre: string) =>
  nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Cambios {
  creados: string[];
  editados: string[];
  dadosDeBaja: string[];
  reservasCanceladas: number;
  reservasSinAviso: number;
}

interface Destino {
  pedido: EspacioDto;
  actual?: EspacioComun;
}

@Injectable()
export class EspaciosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly cancelacionesService: CancelacionesService,
  ) {}

  async listar(red: ContextoRed, manager = this.dataSource.manager) {
    const espacios = await manager.find(EspacioComun, {
      where: { idRed: red.idRed, estado: true },
      order: { idEspacio: 'ASC' },
    });
    const bloques = espacios.length
      ? await manager.find(ReservaBloque, {
          where: { idEspacio: In(espacios.map((e) => e.idEspacio)) },
          order: { horaInicio: 'ASC' },
        })
      : [];
    return espacios.map((espacio) => ({
      idEspacio: espacio.idEspacio,
      nombre: espacio.nombre,
      descripcion: espacio.descripcion,
      capacidad: espacio.capacidad,
      bloques: bloques
        .filter((bloque) => bloque.idEspacio === espacio.idEspacio)
        .map((bloque) => ({
          idBloque: bloque.idBloque,
          horaInicio: bloque.horaInicio,
          horaFin: bloque.horaFin,
        })),
    }));
  }

  async guardar(red: ContextoRed, idUsuario: number, dto: GuardarEspaciosDto) {
    this.validar(dto.espacios);
    const { cambios, correos } = await this.dataSource.transaction(
      async (manager) => {
        await manager.findOne(RedVecinal, {
          where: { idRed: red.idRed },
          lock: { mode: 'pessimistic_write' },
        });
        const actuales = await manager.find(EspacioComun, {
          where: { idRed: red.idRed },
          lock: { mode: 'pessimistic_write' },
        });
        const destino = this.emparejar(dto.espacios, actuales);
        const conservados = new Set(
          destino.flatMap(({ actual }) => (actual ? [actual.idEspacio] : [])),
        );
        this.validarNombresLibres(destino, actuales, conservados);
        const cambios: Cambios = {
          creados: [],
          editados: [],
          dadosDeBaja: [],
          reservasCanceladas: 0,
          reservasSinAviso: 0,
        };
        const correos: CorreoSaliente[] = [];
        const nombres = new Map(
          actuales.map((espacio) => [espacio.idEspacio, espacio.nombre]),
        );
        const nombreEspacio = (id: number) => nombres.get(id) ?? 'Espacio';

        for (const espacio of actuales) {
          if (espacio.estado && !conservados.has(espacio.idEspacio)) {
            await manager.update(
              EspacioComun,
              { idEspacio: espacio.idEspacio },
              { estado: false },
            );
            cambios.dadosDeBaja.push(espacio.nombre);
            const futuras = await this.reservasPorCancelar(
              manager,
              espacio.idEspacio,
            );
            const resultado = await this.cancelacionesService.cancelar(
              manager,
              red.idRed,
              futuras,
              nombreEspacio,
              MOTIVO_BAJA,
            );
            correos.push(...resultado.correos);
            cambios.reservasCanceladas += futuras.length;
            cambios.reservasSinAviso += resultado.sinAviso;
          }
        }

        for (const actual of this.renombresEnConflicto(destino)) {
          await manager.update(
            EspacioComun,
            { idEspacio: actual.idEspacio },
            { nombre: `#${actual.idEspacio}` },
          );
        }

        for (const { pedido, actual } of destino) {
          const campos = {
            nombre: pedido.nombre,
            descripcion: pedido.descripcion ?? null,
            capacidad: pedido.capacidad ?? null,
            estado: true,
          };
          let idEspacio: number;
          let cambio = false;
          if (actual) {
            idEspacio = actual.idEspacio;
            cambio =
              actual.nombre !== campos.nombre ||
              actual.descripcion !== campos.descripcion ||
              actual.capacidad !== campos.capacidad ||
              !actual.estado;
            if (cambio) {
              await manager.update(EspacioComun, { idEspacio }, campos);
            }
          } else {
            const { identifiers } = await manager.insert(EspacioComun, {
              ...campos,
              idRed: red.idRed,
            });
            idEspacio = identifiers[0].idEspacio as number;
            cambios.creados.push(pedido.nombre);
          }
          nombres.set(idEspacio, pedido.nombre);
          const { cambiaron, canceladas } = await this.sincronizarBloques(
            manager,
            idEspacio,
            pedido.bloques,
          );
          if (actual && (cambio || cambiaron)) {
            cambios.editados.push(pedido.nombre);
          }
          const resultado = await this.cancelacionesService.cancelar(
            manager,
            red.idRed,
            canceladas,
            nombreEspacio,
            MOTIVO_HORARIO,
          );
          correos.push(...resultado.correos);
          cambios.reservasCanceladas += canceladas.length;
          cambios.reservasSinAviso += resultado.sinAviso;
        }

        if (
          cambios.creados.length ||
          cambios.editados.length ||
          cambios.dadosDeBaja.length
        ) {
          await this.bitacoraService.registrar(
            {
              ambito: AmbitoBitacora.COMUNIDAD,
              idRed: red.idRed,
              idUsuario,
              accion: 'guardar_espacios',
              entidad: 'espacios_comunes',
              idEntidad: null,
              detalle: { ...cambios },
            },
            manager,
          );
        }
        return { cambios, correos };
      },
    );
    if (
      cambios.creados.length ||
      cambios.editados.length ||
      cambios.dadosDeBaja.length
    ) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    this.cancelacionesService.enviar(correos);
    return {
      espacios: await this.listar(red),
      reservasCanceladas: cambios.reservasCanceladas,
      reservasSinAviso: cambios.reservasSinAviso,
    };
  }

  private validar(espacios: EspacioDto[]) {
    const nombres = espacios.map((espacio) => clave(espacio.nombre));
    if (new Set(nombres).size !== nombres.length) {
      throw new BadRequestException('No repitas espacios comunes');
    }
    const ids = espacios.flatMap((espacio) =>
      espacio.idEspacio ? [espacio.idEspacio] : [],
    );
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Un espacio aparece dos veces');
    }
    for (const espacio of espacios) {
      espacio.bloques.forEach((bloque, i) => {
        if (bloque.horaFin <= bloque.horaInicio) {
          throw new BadRequestException(
            `${espacio.nombre}: cada horario debe terminar después de empezar`,
          );
        }
        if (
          espacio.bloques.some((otro, j) => j !== i && seCruzan(bloque, otro))
        ) {
          throw new BadRequestException(
            `${espacio.nombre}: los horarios no pueden cruzarse`,
          );
        }
      });
    }
  }

  private validarNombresLibres(
    destino: Destino[],
    actuales: EspacioComun[],
    conservados: Set<number>,
  ) {
    for (const { pedido } of destino) {
      const ocupado = actuales.some(
        (espacio) =>
          !conservados.has(espacio.idEspacio) &&
          clave(espacio.nombre) === clave(pedido.nombre),
      );
      if (ocupado) {
        throw new BadRequestException(
          `Ya hubo un espacio llamado ${pedido.nombre}: agrégalo como espacio nuevo para recuperarlo o usa otro nombre`,
        );
      }
    }
  }

  private renombresEnConflicto(destino: Destino[]) {
    return destino.flatMap(({ pedido, actual }) =>
      actual &&
      clave(actual.nombre) !== clave(pedido.nombre) &&
      destino.some(
        (otro) =>
          otro.actual !== actual &&
          clave(otro.pedido.nombre) === clave(actual.nombre),
      )
        ? [actual]
        : [],
    );
  }

  private emparejar(
    pedidos: EspacioDto[],
    actuales: EspacioComun[],
  ): Destino[] {
    const porId = new Map(actuales.map((e) => [e.idEspacio, e]));
    const usados = new Set<number>();
    for (const pedido of pedidos) {
      if (pedido.idEspacio) {
        if (!porId.has(pedido.idEspacio)) {
          throw new NotFoundException('Espacio no encontrado');
        }
        usados.add(pedido.idEspacio);
      }
    }
    return pedidos.map((pedido) => {
      if (pedido.idEspacio) {
        return { pedido, actual: porId.get(pedido.idEspacio) };
      }
      const mismoNombre = actuales.find(
        (e) =>
          !usados.has(e.idEspacio) && clave(e.nombre) === clave(pedido.nombre),
      );
      if (mismoNombre) {
        usados.add(mismoNombre.idEspacio);
      }
      return { pedido, actual: mismoNombre };
    });
  }

  private async sincronizarBloques(
    manager: EntityManager,
    idEspacio: number,
    pedidos: BloqueDto[],
  ) {
    const existentes = await manager.find(ReservaBloque, {
      where: { idEspacio },
      withDeleted: true,
    });
    const porInicio = new Map(existentes.map((b) => [b.horaInicio, b]));
    let cambiaron = false;
    const horasPorCancelar: string[] = [];
    for (const pedido of pedidos) {
      const bloque = porInicio.get(pedido.horaInicio);
      if (!bloque) {
        await manager.insert(ReservaBloque, { idEspacio, ...pedido });
        cambiaron = true;
        continue;
      }
      if (bloque.fechaEliminacion) {
        await manager.restore(ReservaBloque, { idBloque: bloque.idBloque });
        cambiaron = true;
      }
      if (bloque.horaFin !== pedido.horaFin) {
        await manager.update(
          ReservaBloque,
          { idBloque: bloque.idBloque },
          { horaFin: pedido.horaFin },
        );
        horasPorCancelar.push(bloque.horaInicio);
        cambiaron = true;
      }
    }
    const pedidosInicio = new Set(pedidos.map((pedido) => pedido.horaInicio));
    const quitados = existentes.filter(
      (bloque) =>
        !bloque.fechaEliminacion && !pedidosInicio.has(bloque.horaInicio),
    );
    if (quitados.length > 0) {
      await manager.softDelete(ReservaBloque, {
        idBloque: In(quitados.map((bloque) => bloque.idBloque)),
      });
      horasPorCancelar.push(...quitados.map((bloque) => bloque.horaInicio));
      cambiaron = true;
    }
    if (horasPorCancelar.length === 0) {
      return { cambiaron, canceladas: [] as Reserva[] };
    }
    const canceladas = await this.reservasPorCancelar(
      manager,
      idEspacio,
      horasPorCancelar,
    );
    return { cambiaron, canceladas };
  }

  private reservasPorCancelar(
    manager: EntityManager,
    idEspacio: number,
    horas?: string[],
  ) {
    const hoy = fechaHoy();
    const base = {
      idEspacio,
      estadoReserva: In(ESTADOS_ACTIVOS),
      entregadoEn: IsNull(),
    };
    const porBloque = horas ? { horaInicio: In(horas) } : {};
    return manager.find(Reserva, {
      where: [
        { ...base, ...porBloque, fechaReserva: MoreThan(hoy) },
        {
          ...base,
          ...porBloque,
          fechaReserva: hoy,
          horaFin: MoreThan(horaActual()),
        },
      ],
      lock: { mode: 'pessimistic_write' },
    });
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaHoy } from '../common/utils/vigencia';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CorreosFinanzasService } from './correos-finanzas.service';
import { CrearCobroDto, EditarCobroDto } from './dto/finanzas.dto';
import { AvisoPago } from './entities/aviso-pago.entity';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { Exencion } from './entities/exencion.entity';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from './entities/notificacion-enviada.entity';
import { fechaLegible, periodoActual, pesos } from './reglas-finanzas';

const FILAS_POR_INSERCION = 500;

@Injectable()
export class CobrosService {
  constructor(
    @InjectRepository(Cobro)
    private readonly cobrosRepository: Repository<Cobro>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly correosService: CorreosFinanzasService,
  ) {}

  async listar(red: ContextoRed) {
    const cobros = await this.cobrosRepository.find({
      where: { idRed: red.idRed },
      relations: { categoria: true, unidades: true },
      order: { periodo: 'DESC', idCobro: 'DESC' },
    });
    return cobros.map((cobro) => this.serializar(cobro));
  }

  async crear(red: ContextoRed, idUsuario: number, dto: CrearCobroDto) {
    const hoy = fechaHoy();
    const { idCobro, destinatarios } = await this.dataSource.transaction(
      async (manager) => {
        const categoria = await manager.findOne(CategoriaGasto, {
          where: { idCategoria: dto.idCategoria, idRed: red.idRed },
        });
        if (!categoria?.activa) {
          throw new BadRequestException(
            'La categoría no existe o está desactivada',
          );
        }
        const unidades = await manager.find(Unidad, {
          select: { idUnidad: true },
          where: { idRed: red.idRed },
          order: { orden: 'ASC', idUnidad: 'ASC' },
        });
        if (unidades.length === 0) {
          throw new BadRequestException(
            'La comunidad todavía no tiene unidades para cobrar',
          );
        }
        const { identifiers } = await manager.insert(Cobro, {
          idRed: red.idRed,
          idCategoria: categoria.idCategoria,
          concepto: dto.concepto,
          descripcion: dto.descripcion ?? null,
          montoPorUnidad: dto.montoPorUnidad,
          periodo: periodoActual(hoy),
          fechaEmision: hoy,
          fechaVencimiento: dto.fechaVencimiento,
          extraordinario: dto.extraordinario ?? false,
          creadoPor: idUsuario,
        });
        const idCobro = identifiers[0].idCobro as number;
        for (let i = 0; i < unidades.length; i += FILAS_POR_INSERCION) {
          await manager.insert(
            CobroUnidad,
            unidades.slice(i, i + FILAS_POR_INSERCION).map((unidad) => ({
              idCobro,
              idUnidad: unidad.idUnidad,
              monto: dto.montoPorUnidad,
            })),
          );
        }
        const destinatarios = await this.correosService.destinatarios(
          manager,
          red.idRed,
          unidades.map((unidad) => unidad.idUnidad),
        );
        await manager.insert(NotificacionEnviada, {
          idRed: red.idRed,
          tipo: TipoNotificacion.NUEVO_COBRO,
          asunto: dto.concepto,
          idCobro,
          destinatarios: destinatarios.length,
          enviadoPor: idUsuario,
        });
        await this.registrar(manager, red, idUsuario, 'crear_cobro', idCobro, {
          concepto: dto.concepto,
          montoPorUnidad: dto.montoPorUnidad,
          fechaVencimiento: dto.fechaVencimiento,
          unidades: unidades.length,
          destinatarios: destinatarios.length,
        });
        return { idCobro, destinatarios };
      },
    );

    await this.bitacoraService.marcarActividad(red.idRed);
    this.correosService.enviarEnSegundoPlano(
      destinatarios.map((destinatario) => ({
        para: destinatario.correo,
        asunto: `Nuevo cobro: ${dto.concepto}`,
        texto:
          `Hola ${destinatario.nombre}:\n\n` +
          `Se emitió el cobro «${dto.concepto}» por ${pesos(dto.montoPorUnidad)} por unidad, ` +
          `con vencimiento el ${fechaLegible(dto.fechaVencimiento)}.\n\n` +
          `Revisa el detalle y los datos para transferir en la app EntreCasas.`,
      })),
    );
    return {
      ...(await this.detalle(red, idCobro)),
      correos: destinatarios.length,
    };
  }

  async editar(
    red: ContextoRed,
    idUsuario: number,
    idCobro: number,
    dto: EditarCobroDto,
  ) {
    const cambiado = await this.dataSource.transaction(async (manager) => {
      const cobro = await this.bloquear(manager, red, idCobro);
      const cambios: Partial<Cobro> = {};
      if (dto.concepto !== undefined && dto.concepto !== cobro.concepto) {
        cambios.concepto = dto.concepto;
      }
      if (
        dto.descripcion !== undefined &&
        dto.descripcion !== cobro.descripcion
      ) {
        cambios.descripcion = dto.descripcion;
      }
      if (
        dto.fechaVencimiento !== undefined &&
        dto.fechaVencimiento !== cobro.fechaVencimiento
      ) {
        if (dto.fechaVencimiento < cobro.fechaEmision) {
          throw new BadRequestException(
            'El vencimiento no puede ser anterior a la emisión del cobro',
          );
        }
        cambios.fechaVencimiento = dto.fechaVencimiento;
      }
      if (
        dto.montoPorUnidad !== undefined &&
        dto.montoPorUnidad !== cobro.montoPorUnidad
      ) {
        if (await this.tieneMovimientos(manager, idCobro)) {
          throw new ConflictException(
            'No puedes cambiar el monto: el cobro ya tiene pagos, avisos o exenciones',
          );
        }
        cambios.montoPorUnidad = dto.montoPorUnidad;
      }
      if (Object.keys(cambios).length === 0) {
        return false;
      }
      await manager.update(Cobro, { idCobro, idRed: red.idRed }, cambios);
      if (cambios.montoPorUnidad !== undefined) {
        await manager.update(
          CobroUnidad,
          { idCobro },
          { monto: cambios.montoPorUnidad },
        );
      }
      await this.registrar(manager, red, idUsuario, 'editar_cobro', idCobro, {
        concepto: cobro.concepto,
        cambios,
      });
      return true;
    });
    if (cambiado) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    return this.detalle(red, idCobro);
  }

  async eliminar(
    red: ContextoRed,
    idUsuario: number,
    idCobro: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const cobro = await this.bloquear(manager, red, idCobro);
      if (await this.tieneMovimientos(manager, idCobro)) {
        throw new ConflictException(
          'No puedes eliminar el cobro: ya tiene pagos, avisos o exenciones',
        );
      }
      await manager.softDelete(CobroUnidad, { idCobro });
      await manager.softDelete(Cobro, { idCobro, idRed: red.idRed });
      await this.registrar(manager, red, idUsuario, 'eliminar_cobro', idCobro, {
        concepto: cobro.concepto,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  private async detalle(red: ContextoRed, idCobro: number) {
    const cobro = await this.cobrosRepository.findOne({
      where: { idCobro, idRed: red.idRed },
      relations: { categoria: true, unidades: true },
    });
    if (!cobro) {
      throw new NotFoundException('Cobro no encontrado');
    }
    return this.serializar(cobro);
  }

  private async bloquear(
    manager: EntityManager,
    red: ContextoRed,
    idCobro: number,
  ) {
    const cobro = await manager.findOne(Cobro, {
      where: { idCobro, idRed: red.idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!cobro) {
      throw new NotFoundException('Cobro no encontrado');
    }
    return cobro;
  }

  private async tieneMovimientos(manager: EntityManager, idCobro: number) {
    const [noPendientes, avisos, exenciones] = await Promise.all([
      manager.exists(CobroUnidad, {
        where: { idCobro, estado: Not(EstadoCobroUnidad.PENDIENTE) },
      }),
      manager.exists(AvisoPago, { where: { cobroUnidad: { idCobro } } }),
      manager.exists(Exencion, { where: { cobroUnidad: { idCobro } } }),
    ]);
    return noPendientes || avisos || exenciones;
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idCobro: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'cobros',
        idEntidad: idCobro,
        detalle,
      },
      manager,
    );
  }

  private serializar(cobro: Cobro) {
    const filas = cobro.unidades ?? [];
    const suma = (lista: CobroUnidad[]) =>
      lista.reduce((total, fila) => total + fila.monto, 0);
    const conEstado = (estado: EstadoCobroUnidad) =>
      filas.filter((fila) => fila.estado === estado);
    return {
      idCobro: cobro.idCobro,
      concepto: cobro.concepto,
      descripcion: cobro.descripcion,
      categoria: cobro.categoria
        ? {
            idCategoria: cobro.categoria.idCategoria,
            nombre: cobro.categoria.nombre,
          }
        : null,
      montoPorUnidad: cobro.montoPorUnidad,
      periodo: cobro.periodo,
      fechaEmision: cobro.fechaEmision,
      fechaVencimiento: cobro.fechaVencimiento,
      extraordinario: cobro.extraordinario,
      totales: {
        unidades: filas.length,
        pagadas: conEstado(EstadoCobroUnidad.PAGADO).length,
        exentas: conEstado(EstadoCobroUnidad.EXENTO).length,
        pendientes: conEstado(EstadoCobroUnidad.PENDIENTE).length,
        esperado: suma(
          filas.filter((fila) => fila.estado !== EstadoCobroUnidad.EXENTO),
        ),
        recaudado: suma(conEstado(EstadoCobroUnidad.PAGADO)),
      },
    };
  }
}

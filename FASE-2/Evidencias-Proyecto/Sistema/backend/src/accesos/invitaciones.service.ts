import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  MoreThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { CodigoError } from '../common/errores/codigo-error.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { CrearInvitacionDto } from './dto/accesos.dto';
import { Invitacion } from './entities/invitacion.entity';
import {
  accesosPorInvitacion,
  serializarInvitacion,
} from './presentacion-accesos';
import {
  generarCodigo,
  inicioDelDia,
  MAX_DIAS_ANTICIPACION,
  MAX_DURACION_MS,
  MAX_INVITACIONES_LISTADAS,
  MAX_INVITACIONES_VIGENTES,
  MINUTO_MS,
} from './reglas-accesos';

const INTENTOS_CODIGO = 5;

const errorDeFechas = (campo: 'validaDesde' | 'validaHasta', mensaje: string) =>
  new BadRequestException({ message: mensaje, campos: { [campo]: mensaje } });

@Injectable()
export class InvitacionesService {
  constructor(
    @InjectRepository(Invitacion)
    private readonly invitacionesRepository: Repository<Invitacion>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed, idUsuario: number) {
    const visibles = await this.visibles(
      this.dataSource.manager,
      red,
      idUsuario,
    );
    if (visibles.length === 0) {
      return { invitaciones: [] };
    }
    const invitaciones = await this.invitacionesRepository.find({
      where: visibles,
      relations: { unidad: true },
      order: { validaDesde: 'DESC', idInvitacion: 'DESC' },
      take: MAX_INVITACIONES_LISTADAS,
    });
    return { invitaciones: await this.serializar(invitaciones, idUsuario) };
  }

  async detalle(red: ContextoRed, idUsuario: number, idInvitacion: number) {
    const visibles = await this.visibles(
      this.dataSource.manager,
      red,
      idUsuario,
      idInvitacion,
    );
    const invitacion = visibles.length
      ? await this.invitacionesRepository.findOne({
          where: visibles,
          relations: { unidad: true },
        })
      : null;
    if (!invitacion) {
      throw new NotFoundException('Invitación no encontrada');
    }
    const [resultado] = await this.serializar([invitacion], idUsuario);
    return resultado;
  }

  async crear(red: ContextoRed, idUsuario: number, dto: CrearInvitacionDto) {
    if (red.idsUnidades.length === 0) {
      throw new ForbiddenException(
        'Solo quienes viven en la comunidad pueden invitar visitas',
      );
    }
    if (!red.modulos.includes(CodigoModulo.CONSERJERIA)) {
      throw new ForbiddenException({
        codigo: CodigoError.MODULO_INACTIVO,
        message:
          'Tu comunidad no tiene conserjería que valide las invitaciones',
      });
    }
    const idUnidad = dto.idUnidad ?? red.idsUnidades[0];
    if (!red.idsUnidades.includes(idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const ahora = new Date();
    const desde = new Date(dto.validaDesde);
    const hasta = new Date(dto.validaHasta);
    if (hasta <= desde) {
      throw errorDeFechas(
        'validaHasta',
        'La hora de término debe ser posterior a la de inicio',
      );
    }
    if (hasta <= ahora) {
      throw errorDeFechas(
        'validaHasta',
        'La invitación debe terminar en el futuro',
      );
    }
    if (hasta.getTime() - desde.getTime() > MAX_DURACION_MS) {
      throw errorDeFechas(
        'validaHasta',
        'Una invitación puede durar como máximo 24 horas',
      );
    }
    if (
      desde.getTime() >
      ahora.getTime() + MAX_DIAS_ANTICIPACION * 24 * 60 * MINUTO_MS
    ) {
      throw errorDeFechas(
        'validaDesde',
        `Solo puedes invitar con hasta ${MAX_DIAS_ANTICIPACION} días de anticipación`,
      );
    }
    const idInvitacion = await this.dataSource.transaction(async (manager) => {
      const unidad = await manager.findOne(Unidad, {
        where: { idUnidad, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!unidad) {
        throw new NotFoundException('Unidad no encontrada');
      }
      const pendientes = await this.sinUsarVigentes(
        manager,
        red,
        idUnidad,
        ahora,
      );
      if (pendientes >= MAX_INVITACIONES_VIGENTES) {
        throw new ConflictException(
          `Tu vivienda puede tener hasta ${MAX_INVITACIONES_VIGENTES} invitaciones por usar. Cancela alguna para crear otra`,
        );
      }
      const codigo = await this.codigoLibre(manager);
      const { identifiers } = await manager.insert(Invitacion, {
        idRed: red.idRed,
        idUnidad,
        creadaPor: idUsuario,
        nombreVisita: dto.nombre,
        identificadorVisita: dto.rut ?? null,
        patente: dto.patente ?? null,
        categoria: dto.categoria,
        codigo,
        validaDesde: desde,
        validaHasta: hasta,
      });
      return identifiers[0].idInvitacion as number;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idInvitacion);
  }

  async cancelar(red: ContextoRed, idUsuario: number, idInvitacion: number) {
    await this.dataSource.transaction(async (manager) => {
      const visibles = await this.visibles(
        manager,
        red,
        idUsuario,
        idInvitacion,
      );
      const invitacion = visibles.length
        ? await manager.findOne(Invitacion, {
            where: visibles,
            lock: { mode: 'pessimistic_write' },
          })
        : null;
      if (!invitacion) {
        throw new NotFoundException('Invitación no encontrada');
      }
      if (invitacion.canceladaEn) {
        throw new ConflictException('La invitación ya estaba cancelada');
      }
      const usadas = await accesosPorInvitacion(manager, [idInvitacion]);
      if (usadas.size > 0) {
        throw new ConflictException(
          'La visita ya ingresó: la invitación no se puede cancelar',
        );
      }
      const ahora = new Date();
      if (invitacion.validaHasta <= ahora) {
        throw new ConflictException('La invitación ya venció');
      }
      await manager.update(
        Invitacion,
        { idInvitacion },
        { canceladaEn: ahora },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idUsuario, idInvitacion);
  }

  private async visibles(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    idInvitacion?: number,
  ): Promise<FindOptionsWhere<Invitacion>[]> {
    if (red.idsUnidades.length === 0) {
      return [];
    }
    const residencias = await manager.find(Residencia, {
      select: { idUnidad: true, desde: true },
      where: {
        idUsuario,
        idUnidad: In(red.idsUnidades),
        ...condicionVigente(),
      },
    });
    const desdeDe = new Map<number, string>();
    for (const { idUnidad, desde } of residencias) {
      const actual = desdeDe.get(idUnidad);
      if (!actual || desde < actual) {
        desdeDe.set(idUnidad, desde);
      }
    }
    return [...desdeDe].map(([idUnidad, desde]) => ({
      ...(idInvitacion ? { idInvitacion } : {}),
      idRed: red.idRed,
      idUnidad,
      fechaCreacion: MoreThanOrEqual(inicioDelDia(desde)),
    }));
  }

  private async sinUsarVigentes(
    manager: EntityManager,
    red: ContextoRed,
    idUnidad: number,
    ahora: Date,
  ) {
    const vigentes = await manager.find(Invitacion, {
      select: { idInvitacion: true },
      where: {
        idRed: red.idRed,
        idUnidad,
        canceladaEn: IsNull(),
        validaHasta: MoreThan(ahora),
      },
    });
    const usadas = await accesosPorInvitacion(
      manager,
      vigentes.map((i) => i.idInvitacion),
    );
    return vigentes.length - usadas.size;
  }

  private async codigoLibre(manager: EntityManager): Promise<string> {
    for (let intento = 0; intento < INTENTOS_CODIGO; intento++) {
      const codigo = generarCodigo();
      const ocupado = await manager.exists(Invitacion, {
        where: { codigo },
        withDeleted: true,
      });
      if (!ocupado) {
        return codigo;
      }
    }
    throw new InternalServerErrorException(
      'No pudimos generar un código de invitación',
    );
  }

  private async serializar(invitaciones: Invitacion[], idUsuario: number) {
    const manager = this.dataSource.manager;
    const [accesos, nombres] = await Promise.all([
      accesosPorInvitacion(
        manager,
        invitaciones.map((i) => i.idInvitacion),
      ),
      nombresPorId(
        manager,
        invitaciones.map((i) => i.creadaPor),
      ),
    ]);
    const ahora = new Date();
    return invitaciones.map((invitacion) =>
      serializarInvitacion(
        invitacion,
        accesos.get(invitacion.idInvitacion),
        nombres,
        invitacion.creadaPor === idUsuario ? 'creador' : 'hogar',
        ahora,
      ),
    );
  }
}

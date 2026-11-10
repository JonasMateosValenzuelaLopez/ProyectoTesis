import {
  ConflictException,
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
  LessThanOrEqual,
  Like,
  MoreThan,
  Not,
  Repository,
} from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente, fechaHoy } from '../common/utils/vigencia';
import { PaginaMuroDto } from '../muro/dto/muro.dto';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { nombreCompleto } from '../common/utils/nombres';
import { escaparLike } from '../common/utils/texto';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { finDelDia } from '../votaciones/reglas-votaciones';
import {
  CodigoInvitacionDto,
  DecisionAccesoDto,
  IngresoSinInvitacionDto,
} from './dto/accesos.dto';
import { Invitacion } from './entities/invitacion.entity';
import {
  EstadoAutorizacion,
  MetodoAcceso,
  RegistroAcceso,
  ViaAutorizacion,
} from './entities/registro-acceso.entity';
import { Vehiculo } from './entities/vehiculo.entity';
import {
  accesosPorInvitacion,
  conflictoDeResolucion,
  nombresDeAccesos,
  serializarAcceso,
  serializarInvitacion,
  vivienda,
} from './presentacion-accesos';
import {
  decisionAcceso,
  limitePendiente,
  MENSAJE_RESULTADO,
  normalizarCodigo,
  resultadoValidacion,
} from './reglas-accesos';
import { obtenerVisitante } from './visitantes';

const LIMITE_POR_DEFECTO = 50;
const MAX_RESULTADOS_BUSQUEDA = 8;
const MAX_LISTA_GARITA = 200;

@Injectable()
export class PorteriaService {
  constructor(
    @InjectRepository(Invitacion)
    private readonly invitacionesRepository: Repository<Invitacion>,
    @InjectRepository(RegistroAcceso)
    private readonly accesosRepository: Repository<RegistroAcceso>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly cuentasService: CuentasService,
  ) {}

  async resumen(red: ContextoRed) {
    const ahora = new Date();
    const [candidatas, adentro, porAutorizar] = await Promise.all([
      this.invitacionesRepository.find({
        where: {
          idRed: red.idRed,
          canceladaEn: IsNull(),
          validaHasta: MoreThan(ahora),
          validaDesde: LessThanOrEqual(finDelDia(fechaHoy(ahora))),
        },
        relations: { unidad: true },
        order: { validaDesde: 'ASC' },
        take: MAX_LISTA_GARITA,
      }),
      this.accesosRepository.find({
        where: {
          idRed: red.idRed,
          estadoAutorizacion: EstadoAutorizacion.APROBADO,
          fechaSalida: IsNull(),
        },
        relations: { visitante: true, unidad: true },
        order: { fechaIngreso: 'ASC' },
        take: MAX_LISTA_GARITA,
      }),
      this.accesosRepository.find({
        where: {
          idRed: red.idRed,
          estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
          fechaCreacion: MoreThan(limitePendiente(ahora)),
        },
        relations: { visitante: true, unidad: true },
        order: { idAcceso: 'ASC' },
        take: MAX_LISTA_GARITA,
      }),
    ]);
    const manager = this.dataSource.manager;
    const usadas = await accesosPorInvitacion(
      manager,
      candidatas.map((i) => i.idInvitacion),
    );
    const esperadas = candidatas.filter((i) => !usadas.has(i.idInvitacion));
    const [nombresInvitan, nombresAccesos] = await Promise.all([
      nombresPorId(
        manager,
        esperadas.map((i) => i.creadaPor),
      ),
      nombresDeAccesos(manager, [...adentro, ...porAutorizar]),
    ]);
    return {
      esperadas: esperadas.map((i) =>
        serializarInvitacion(i, undefined, nombresInvitan, 'garita', ahora),
      ),
      adentro: adentro.map((a) => serializarAcceso(a, nombresAccesos)),
      porAutorizar: porAutorizar.map((a) =>
        serializarAcceso(a, nombresAccesos),
      ),
    };
  }

  async monitor(red: ContextoRed, filtro: PaginaMuroDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const comun = {
      idRed: red.idRed,
      ...(filtro.antesDe ? { idAcceso: LessThan(filtro.antesDe) } : {}),
    };
    const filas = await this.accesosRepository.find({
      where: [
        {
          ...comun,
          estadoAutorizacion: Not(EstadoAutorizacion.PENDIENTE),
        },
        {
          ...comun,
          estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
          fechaCreacion: LessThanOrEqual(limitePendiente()),
        },
      ],
      relations: { visitante: true, unidad: true },
      order: { idAcceso: 'DESC' },
      take: limite + 1,
    });
    const accesos = filas.slice(0, limite);
    const nombres = await nombresDeAccesos(this.dataSource.manager, accesos);
    return {
      accesos: accesos.map((a) => serializarAcceso(a, nombres)),
      siguiente:
        filas.length > limite ? accesos[accesos.length - 1].idAcceso : null,
    };
  }

  async validar(red: ContextoRed, dto: CodigoInvitacionDto) {
    const invitacion = await this.porCodigo(
      this.dataSource.manager,
      red,
      dto.codigo,
    );
    const acceso = invitacion
      ? await this.accesosRepository.findOne({
          where: { idInvitacion: invitacion.idInvitacion },
          withDeleted: true,
        })
      : null;
    const resultado = resultadoValidacion(
      invitacion,
      acceso,
      await this.invitanteVigente(this.dataSource.manager, red, invitacion),
    );
    if (!invitacion) {
      return { resultado, invitacion: null };
    }
    const nombres = await nombresPorId(this.dataSource.manager, [
      invitacion.creadaPor,
    ]);
    return {
      resultado,
      invitacion: serializarInvitacion(
        invitacion,
        acceso ?? undefined,
        nombres,
        'garita',
      ),
    };
  }

  ingresoConCodigo(
    red: ContextoRed,
    idUsuario: number,
    dto: CodigoInvitacionDto,
  ) {
    return this.registrarIngreso(
      red,
      idUsuario,
      (manager) => this.porCodigo(manager, red, dto.codigo, true),
      MetodoAcceso.QR,
      MENSAJE_RESULTADO.no_existe,
    );
  }

  ingresoPorInvitacion(
    red: ContextoRed,
    idUsuario: number,
    idInvitacion: number,
  ) {
    return this.registrarIngreso(
      red,
      idUsuario,
      (manager) =>
        manager.findOne(Invitacion, {
          where: { idInvitacion, idRed: red.idRed },
          lock: { mode: 'pessimistic_write' },
        }),
      MetodoAcceso.MANUAL,
      'Invitación no encontrada',
    );
  }

  async registrarSalida(red: ContextoRed, idAcceso: number) {
    const { affected } = await this.accesosRepository.update(
      {
        idAcceso,
        idRed: red.idRed,
        estadoAutorizacion: EstadoAutorizacion.APROBADO,
        fechaSalida: IsNull(),
        fechaEliminacion: IsNull(),
      },
      { fechaSalida: new Date() },
    );
    if (!affected) {
      const existe = await this.accesosRepository.exists({
        where: { idAcceso, idRed: red.idRed },
      });
      if (!existe) {
        throw new NotFoundException('Ingreso no encontrado');
      }
      throw new ConflictException(
        'La salida ya estaba registrada o la visita no ingresó',
      );
    }
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.acceso(red, idAcceso);
  }

  async ingresoSinInvitacion(
    red: ContextoRed,
    idUsuario: number,
    dto: IngresoSinInvitacionDto,
  ) {
    const idAcceso = await this.dataSource.transaction(async (manager) => {
      const unidad = await manager.findOne(Unidad, {
        where: { idUnidad: dto.idUnidad, idRed: red.idRed },
      });
      if (!unidad) {
        throw new NotFoundException('Unidad no encontrada');
      }
      const idVisitante = await obtenerVisitante(
        manager,
        red.idRed,
        dto.nombre,
        dto.rut ?? null,
      );
      const { identifiers } = await manager.insert(RegistroAcceso, {
        idRed: red.idRed,
        idVisitante,
        idUnidad: dto.idUnidad,
        idInvitacion: null,
        categoria: dto.categoria,
        patente: dto.patente ?? null,
        fechaIngreso: null,
        estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
        autorizadoVia: null,
        autorizadoPor: null,
        validadoPor: idUsuario,
        metodo: MetodoAcceso.MANUAL,
      });
      return identifiers[0].idAcceso as number;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.acceso(red, idAcceso);
  }

  async resolverPorTelefono(
    red: ContextoRed,
    idUsuario: number,
    idAcceso: number,
    dto: DecisionAccesoDto,
  ) {
    const ahora = new Date();
    const { affected } = await this.accesosRepository.update(
      {
        idAcceso,
        idRed: red.idRed,
        estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
        fechaCreacion: MoreThan(limitePendiente(ahora)),
        fechaEliminacion: IsNull(),
      },
      {
        ...decisionAcceso(dto.aprobado, ViaAutorizacion.TELEFONO, ahora),
        autorizadoPor: null,
        validadoPor: idUsuario,
      },
    );
    if (!affected) {
      await this.sinPendiente(red, idAcceso);
    }
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.acceso(red, idAcceso);
  }

  async buscar(red: ContextoRed, texto: string) {
    const manager = this.dataSource.manager;
    const patron = `%${escaparLike(texto)}%`;
    const compacto = texto.toUpperCase().replace(/[\s.-]/g, '');
    const patronCompacto = `%${escaparLike(compacto)}%`;
    const vigente = { unidad: { idRed: red.idRed }, ...condicionVigente() };
    const porIdentificador =
      compacto.length >= 2
        ? [
            ...new Set([
              patronCompacto,
              ...(/^\d+[0-9K]$/.test(compacto)
                ? [`%${compacto.slice(0, -1)}-${compacto.slice(-1)}%`]
                : []),
            ]),
          ].map((patronRut) => ({
            ...vigente,
            usuario: { identificador: Like(patronRut) },
          }))
        : [];
    const [unidades, residencias, vehiculos] = await Promise.all([
      manager.find(Unidad, {
        select: { idUnidad: true },
        where: { idRed: red.idRed, numeroIdentificador: Like(patron) },
        order: { idUnidad: 'ASC' },
        take: MAX_RESULTADOS_BUSQUEDA,
      }),
      manager.find(Residencia, {
        select: { idUnidad: true, idResidencia: true, idUsuario: true },
        where: [
          { ...vigente, usuario: { nombre: Like(patron) } },
          { ...vigente, usuario: { primerApellido: Like(patron) } },
          { ...vigente, usuario: { segundoApellido: Like(patron) } },
          ...porIdentificador,
        ],
        relations: { unidad: true, usuario: true },
        take: MAX_RESULTADOS_BUSQUEDA,
      }),
      compacto.length >= 2
        ? manager.find(Vehiculo, {
            select: { idUnidad: true, idVehiculo: true, idUsuario: true },
            where: {
              patente: Like(patronCompacto),
              unidad: { idRed: red.idRed },
            },
            relations: { unidad: true },
            take: MAX_RESULTADOS_BUSQUEDA,
          })
        : Promise.resolve([] as Vehiculo[]),
    ]);
    const duenos = vehiculos.length
      ? await manager.find(Residencia, {
          select: { idUnidad: true, idUsuario: true, idResidencia: true },
          where: {
            idUsuario: In(vehiculos.map((v) => v.idUsuario)),
            idUnidad: In(
              vehiculos
                .map((v) => v.idUnidad)
                .filter((id): id is number => id !== null),
            ),
            ...condicionVigente(),
          },
        })
      : [];
    const candidatos = [
      ...residencias.map((r) => r.idUsuario),
      ...duenos.map((r) => r.idUsuario),
    ];
    const conAcceso = candidatos.length
      ? await this.cuentasService.conAcceso(manager, red.idRed, candidatos)
      : new Set<number>();
    const viveCon = new Set(
      duenos
        .filter((r) => conAcceso.has(r.idUsuario))
        .map((r) => `${r.idUnidad}:${r.idUsuario}`),
    );
    const ids = [
      ...new Set(
        [
          ...unidades.map((u) => u.idUnidad),
          ...residencias
            .filter((r) => conAcceso.has(r.idUsuario))
            .map((r) => r.idUnidad),
          ...vehiculos
            .filter((v) => viveCon.has(`${v.idUnidad}:${v.idUsuario}`))
            .map((v) => v.idUnidad),
        ].filter((id): id is number => id !== null),
      ),
    ].slice(0, MAX_RESULTADOS_BUSQUEDA);
    return { resultados: await this.fichasDeUnidades(manager, red, ids) };
  }

  private async fichasDeUnidades(
    manager: EntityManager,
    red: ContextoRed,
    ids: number[],
  ) {
    if (ids.length === 0) {
      return [];
    }
    const [unidades, residencias, vehiculos] = await Promise.all([
      manager.find(Unidad, {
        where: { idRed: red.idRed, idUnidad: In(ids) },
        order: { orden: 'ASC', idUnidad: 'ASC' },
      }),
      manager.find(Residencia, {
        where: { idUnidad: In(ids), ...condicionVigente() },
        relations: { usuario: true },
        order: { idResidencia: 'ASC' },
      }),
      manager.find(Vehiculo, {
        where: { idUnidad: In(ids) },
        order: { idVehiculo: 'ASC' },
      }),
    ]);
    const conAcceso = await this.cuentasService.conAcceso(
      manager,
      red.idRed,
      residencias.map((r) => r.idUsuario),
    );
    return unidades.map((unidad) => {
      const residentes = residencias.filter(
        (r) =>
          r.idUnidad === unidad.idUnidad &&
          r.usuario &&
          conAcceso.has(r.idUsuario),
      );
      const idsResidentes = new Set(residentes.map((r) => r.idUsuario));
      return {
        unidad: vivienda(unidad),
        residentes: residentes.map((r) => ({
          idUsuario: r.idUsuario,
          nombre: nombreCompleto(r.usuario),
          tipoResidencia: r.tipo,
          telefono: r.usuario.telefono,
        })),
        vehiculos: vehiculos
          .filter(
            (v) =>
              v.idUnidad === unidad.idUnidad && idsResidentes.has(v.idUsuario),
          )
          .map((v) => ({
            patente: v.patente,
            marca: v.marca,
            modelo: v.modelo,
            color: v.color,
            estacionamiento: v.estacionamiento,
          })),
      };
    });
  }

  private async registrarIngreso(
    red: ContextoRed,
    idUsuario: number,
    buscar: (manager: EntityManager) => Promise<Invitacion | null>,
    metodo: MetodoAcceso,
    mensajeNoExiste: string,
  ) {
    const idAcceso = await this.dataSource.transaction(async (manager) => {
      const invitacion = await buscar(manager);
      const acceso = invitacion
        ? await manager.findOne(RegistroAcceso, {
            where: { idInvitacion: invitacion.idInvitacion },
            withDeleted: true,
          })
        : null;
      const resultado = resultadoValidacion(
        invitacion,
        acceso,
        await this.invitanteVigente(manager, red, invitacion),
      );
      if (!invitacion) {
        throw new NotFoundException(mensajeNoExiste);
      }
      if (resultado !== 'valido') {
        throw new ConflictException(MENSAJE_RESULTADO[resultado]);
      }
      const idVisitante = await obtenerVisitante(
        manager,
        red.idRed,
        invitacion.nombreVisita,
        invitacion.identificadorVisita,
      );
      await manager.update(
        Invitacion,
        { idInvitacion: invitacion.idInvitacion },
        { idVisitante },
      );
      const { identifiers } = await manager.insert(RegistroAcceso, {
        idRed: red.idRed,
        idVisitante,
        idUnidad: invitacion.idUnidad,
        idInvitacion: invitacion.idInvitacion,
        categoria: invitacion.categoria,
        patente: invitacion.patente,
        fechaIngreso: new Date(),
        estadoAutorizacion: EstadoAutorizacion.APROBADO,
        autorizadoVia: ViaAutorizacion.INVITACION,
        autorizadoPor: invitacion.creadaPor,
        validadoPor: idUsuario,
        metodo,
      });
      return identifiers[0].idAcceso as number;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.acceso(red, idAcceso);
  }

  private async porCodigo(
    manager: EntityManager,
    red: ContextoRed,
    codigo: string,
    bloquear = false,
  ) {
    const normalizado = normalizarCodigo(codigo);
    if (!normalizado) {
      return null;
    }
    return manager.findOne(Invitacion, {
      where: { codigo: normalizado, idRed: red.idRed },
      relations: bloquear ? {} : { unidad: true },
      ...(bloquear ? { lock: { mode: 'pessimistic_write' as const } } : {}),
    });
  }

  private async invitanteVigente(
    manager: EntityManager,
    red: ContextoRed,
    invitacion: Invitacion | null,
  ) {
    if (!invitacion?.creadaPor) {
      return false;
    }
    const vive = await manager.exists(Residencia, {
      where: {
        idUsuario: invitacion.creadaPor,
        idUnidad: invitacion.idUnidad,
        ...condicionVigente(),
      },
    });
    if (!vive) {
      return false;
    }
    const conAcceso = await this.cuentasService.conAcceso(manager, red.idRed, [
      invitacion.creadaPor,
    ]);
    return conAcceso.has(invitacion.creadaPor);
  }

  private async sinPendiente(red: ContextoRed, idAcceso: number) {
    const actual = await this.accesosRepository.findOne({
      where: { idAcceso, idRed: red.idRed },
    });
    if (!actual) {
      throw new NotFoundException('Ingreso no encontrado');
    }
    throw conflictoDeResolucion(actual);
  }

  private async acceso(red: ContextoRed, idAcceso: number) {
    const acceso = await this.accesosRepository.findOne({
      where: { idAcceso, idRed: red.idRed },
      relations: { visitante: true, unidad: true },
    });
    if (!acceso) {
      throw new NotFoundException('Ingreso no encontrado');
    }
    const nombres = await nombresDeAccesos(this.dataSource.manager, [acceso]);
    return serializarAcceso(acceso, nombres);
  }
}

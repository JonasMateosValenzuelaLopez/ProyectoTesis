import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaHoy } from '../common/utils/vigencia';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { finDelDia } from '../votaciones/reglas-votaciones';
import { CrearRetencionDto } from './dto/accesos.dto';
import { RetencionAcceso } from './entities/retencion-acceso.entity';
import { persona } from './presentacion-accesos';
import {
  inicioDelDia,
  limiteConservacion,
  MAX_DIAS_RETENCION,
  RETENCION_ACCESOS_MESES,
  VISITA_ANONIMIZADA,
} from './reglas-accesos';

const MAX_RETENCIONES_LISTADAS = 100;
const DIA_MS = 24 * 60 * 60 * 1000;

export const SQL_ANONIMIZAR_ACCESOS = `UPDATE registro_accesos a
SET a.id_visitante = NULL, a.patente = NULL
WHERE a.fecha_creacion < ?
  AND (a.id_visitante IS NOT NULL OR a.patente IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM accesos_retenciones r
    WHERE r.id_red = a.id_red
      AND r.liberada_en IS NULL
      AND r.fecha_eliminacion IS NULL
      AND a.fecha_creacion BETWEEN r.desde AND r.hasta
  )`;

export const SQL_ANONIMIZAR_INVITACIONES = `UPDATE invitaciones i
SET i.nombre_visita = ?, i.identificador_visita = NULL, i.patente = NULL, i.id_visitante = NULL
WHERE i.valida_hasta < ?
  AND (i.identificador_visita IS NOT NULL OR i.patente IS NOT NULL OR i.id_visitante IS NOT NULL OR i.nombre_visita <> ?)
  AND NOT EXISTS (
    SELECT 1 FROM accesos_retenciones r
    WHERE r.id_red = i.id_red
      AND r.liberada_en IS NULL
      AND r.fecha_eliminacion IS NULL
      AND i.valida_desde <= r.hasta
      AND i.valida_hasta >= r.desde
  )`;

export const SQL_ANONIMIZAR_VISITANTES = `UPDATE visitantes v
SET v.rut = NULL, v.nombre = ?, v.apellido = ''
WHERE v.fecha_creacion < ?
  AND (v.rut IS NOT NULL OR v.nombre <> ? OR v.apellido <> '')
  AND NOT EXISTS (SELECT 1 FROM registro_accesos a WHERE a.id_visitante = v.id_visitante)
  AND NOT EXISTS (SELECT 1 FROM invitaciones i WHERE i.id_visitante = v.id_visitante)`;

const filasAfectadas = (resultado: unknown) =>
  Number((resultado as { affectedRows?: number } | null)?.affectedRows ?? 0);

const errorDeFechas = (mensaje: string) =>
  new BadRequestException({ message: mensaje, campos: { hasta: mensaje } });

@Injectable()
export class RetencionAccesosService {
  constructor(
    @InjectRepository(RetencionAcceso)
    private readonly retencionesRepository: Repository<RetencionAcceso>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const retenciones = await this.retencionesRepository.find({
      where: { idRed: red.idRed },
      order: { idRetencion: 'DESC' },
      take: MAX_RETENCIONES_LISTADAS,
    });
    return {
      conservacionMeses: RETENCION_ACCESOS_MESES,
      retenciones: await this.serializar(retenciones),
    };
  }

  async crear(red: ContextoRed, idUsuario: number, dto: CrearRetencionDto) {
    if (dto.hasta < dto.desde) {
      throw errorDeFechas(
        'La fecha de término debe ser igual o posterior a la de inicio',
      );
    }
    const desde = inicioDelDia(dto.desde);
    const hasta = finDelDia(dto.hasta);
    if (
      Math.round((hasta.getTime() - desde.getTime()) / DIA_MS) >
      MAX_DIAS_RETENCION
    ) {
      throw errorDeFechas(
        `Una retención puede cubrir como máximo ${MAX_DIAS_RETENCION} días`,
      );
    }
    if (hasta < limiteConservacion()) {
      throw new ConflictException(
        `Esos registros ya superaron los ${RETENCION_ACCESOS_MESES} meses de conservación y fueron anonimizados`,
      );
    }
    const idRetencion = await this.dataSource.transaction(async (manager) => {
      const { identifiers } = await manager.insert(RetencionAcceso, {
        idRed: red.idRed,
        desde,
        hasta,
        motivo: dto.motivo,
        creadaPor: idUsuario,
      });
      const id = identifiers[0].idRetencion as number;
      await this.registrarEnBitacora(
        manager,
        red,
        idUsuario,
        'retener_registros_acceso',
        id,
        { desde: dto.desde, hasta: dto.hasta },
      );
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idRetencion);
  }

  async liberar(red: ContextoRed, idUsuario: number, idRetencion: number) {
    await this.dataSource.transaction(async (manager) => {
      const retencion = await manager.findOne(RetencionAcceso, {
        where: { idRetencion, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!retencion) {
        throw new NotFoundException('Retención no encontrada');
      }
      if (retencion.liberadaEn) {
        throw new ConflictException('La retención ya estaba liberada');
      }
      await manager.update(
        RetencionAcceso,
        { idRetencion, liberadaEn: IsNull() },
        { liberadaEn: new Date(), liberadaPor: idUsuario },
      );
      await this.registrarEnBitacora(
        manager,
        red,
        idUsuario,
        'liberar_retencion_acceso',
        idRetencion,
        { desde: fechaHoy(retencion.desde), hasta: fechaHoy(retencion.hasta) },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idRetencion);
  }

  async anonimizarVencidos(ahora: Date = new Date()) {
    const limite = limiteConservacion(ahora);
    return this.dataSource.transaction(async (manager) => {
      const accesos = await manager.query(SQL_ANONIMIZAR_ACCESOS, [limite]);
      const invitaciones = await manager.query(SQL_ANONIMIZAR_INVITACIONES, [
        VISITA_ANONIMIZADA,
        limite,
        VISITA_ANONIMIZADA,
      ]);
      const visitantes = await manager.query(SQL_ANONIMIZAR_VISITANTES, [
        VISITA_ANONIMIZADA,
        limite,
        VISITA_ANONIMIZADA,
      ]);
      return {
        limite,
        accesos: filasAfectadas(accesos),
        invitaciones: filasAfectadas(invitaciones),
        visitantes: filasAfectadas(visitantes),
      };
    });
  }

  private async detalle(red: ContextoRed, idRetencion: number) {
    const retencion = await this.retencionesRepository.findOne({
      where: { idRetencion, idRed: red.idRed },
    });
    if (!retencion) {
      throw new NotFoundException('Retención no encontrada');
    }
    const [resultado] = await this.serializar([retencion]);
    return resultado;
  }

  private registrarEnBitacora(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idRetencion: number,
    detalle: { desde: string; hasta: string },
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'accesos_retenciones',
        idEntidad: idRetencion,
        detalle,
      },
      manager,
    );
  }

  private async serializar(retenciones: RetencionAcceso[]) {
    const nombres = await nombresPorId(
      this.dataSource.manager,
      retenciones.flatMap((r) => [r.creadaPor, r.liberadaPor]),
    );
    return retenciones.map((r) => ({
      idRetencion: r.idRetencion,
      desde: fechaHoy(r.desde),
      hasta: fechaHoy(r.hasta),
      motivo: r.motivo,
      activa: r.liberadaEn === null,
      creadaEn: r.fechaCreacion,
      creadaPor: persona(nombres, r.creadaPor),
      liberadaEn: r.liberadaEn,
      liberadaPor: persona(nombres, r.liberadaPor),
    }));
  }
}

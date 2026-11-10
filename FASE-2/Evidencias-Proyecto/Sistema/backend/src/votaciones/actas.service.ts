import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaLegible } from '../finanzas/reglas-finanzas';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { GuardarActaDto } from './dto/votaciones.dto';
import { Acta, ASAMBLEAS } from './entities/acta.entity';
import { AcuerdoActa } from './entities/acuerdo-acta.entity';
import { esDirectiva } from './reglas-votaciones';

@Injectable()
export class ActasService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const actas = await this.dataSource.manager.find(Acta, {
      where: {
        idRed: red.idRed,
        ...(esDirectiva(red) ? {} : { publicada: true }),
      },
      order: { numero: 'DESC' },
    });
    return this.serializar(actas);
  }

  async crear(red: ContextoRed, idUsuario: number, dto: GuardarActaDto) {
    const idActa = await this.dataSource.transaction(async (manager) => {
      const comunidad = await manager.findOne(RedVecinal, {
        where: { idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!comunidad) {
        throw new NotFoundException('Comunidad no encontrada');
      }
      const campos = await this.campos(manager, red, dto);
      const ultima = await manager.findOne(Acta, {
        select: { numero: true },
        where: { idRed: red.idRed },
        order: { numero: 'DESC' },
        withDeleted: true,
      });
      const numero = (ultima?.numero ?? 0) + 1;
      const { identifiers } = await manager.insert(Acta, {
        ...campos,
        idRed: red.idRed,
        numero,
        publicada: false,
        creadaPor: idUsuario,
      });
      const id = identifiers[0].idActa as number;
      await this.guardarAcuerdos(manager, id, dto);
      await this.registrar(manager, red, idUsuario, 'redactar_acta', id, {
        numero,
        tipo: dto.tipo,
        fecha: dto.fecha,
      });
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idActa);
  }

  async editar(
    red: ContextoRed,
    idUsuario: number,
    idActa: number,
    dto: GuardarActaDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const acta = await this.borrador(manager, red, idActa);
      const campos = await this.campos(manager, red, dto);
      await manager.update(Acta, { idActa }, campos);
      await manager.softDelete(AcuerdoActa, { idActa });
      await this.guardarAcuerdos(manager, idActa, dto);
      await this.registrar(manager, red, idUsuario, 'editar_acta', idActa, {
        numero: acta.numero,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idActa);
  }

  async publicar(red: ContextoRed, idUsuario: number, idActa: number) {
    await this.dataSource.transaction(async (manager) => {
      const acta = await this.borrador(manager, red, idActa);
      await manager.update(
        Acta,
        { idActa },
        { publicada: true, publicadaEn: new Date() },
      );
      await this.registrar(manager, red, idUsuario, 'publicar_acta', idActa, {
        numero: acta.numero,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idActa);
  }

  async eliminar(
    red: ContextoRed,
    idUsuario: number,
    idActa: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const acta = await this.borrador(manager, red, idActa);
      await manager.softDelete(AcuerdoActa, { idActa });
      await manager.softDelete(Acta, { idActa });
      await this.registrar(manager, red, idUsuario, 'eliminar_acta', idActa, {
        numero: acta.numero,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  private async campos(
    manager: EntityManager,
    red: ContextoRed,
    dto: GuardarActaDto,
  ) {
    const esAsamblea = ASAMBLEAS.includes(dto.tipo);
    if (!esAsamblea && dto.unidadesPresentes !== undefined) {
      throw new BadRequestException(
        'Las unidades presentes solo se registran en asambleas',
      );
    }
    if (esAsamblea && dto.unidadesPresentes !== undefined) {
      const total = await manager.count(Unidad, {
        where: { idRed: red.idRed },
      });
      if (dto.unidadesPresentes > total) {
        throw new BadRequestException(
          `La comunidad tiene ${total} unidades; no pueden estar presentes más`,
        );
      }
    }
    return {
      titulo: `${dto.tipo} del ${fechaLegible(dto.fecha)}`,
      tipoReunion: dto.tipo,
      fechaAsamblea: dto.fecha,
      lugar: dto.lugar,
      unidadesPresentes: dto.unidadesPresentes ?? null,
      asistentes: dto.asistentes ?? null,
      temas: dto.temas,
    };
  }

  private async guardarAcuerdos(
    manager: EntityManager,
    idActa: number,
    dto: GuardarActaDto,
  ) {
    if (dto.acuerdos.length === 0) {
      return;
    }
    await manager.insert(
      AcuerdoActa,
      dto.acuerdos.map((acuerdo) => ({
        idActa,
        texto: acuerdo.texto,
        responsable: acuerdo.responsable ?? null,
        plazo: acuerdo.plazo ?? null,
      })),
    );
  }

  private async borrador(
    manager: EntityManager,
    red: ContextoRed,
    idActa: number,
  ) {
    const acta = await manager.findOne(Acta, {
      where: { idActa, idRed: red.idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!acta) {
      throw new NotFoundException('Acta no encontrada');
    }
    if (acta.publicada) {
      throw new ConflictException(
        'Un acta publicada no se puede cambiar; redacta un acta rectificatoria',
      );
    }
    return acta;
  }

  private async detalle(red: ContextoRed, idActa: number) {
    const acta = await this.dataSource.manager.findOne(Acta, {
      where: { idActa, idRed: red.idRed },
    });
    if (!acta) {
      throw new NotFoundException('Acta no encontrada');
    }
    const [detalle] = await this.serializar([acta]);
    return detalle;
  }

  private async serializar(actas: Acta[]) {
    if (actas.length === 0) {
      return [];
    }
    const manager = this.dataSource.manager;
    const [acuerdos, nombres] = await Promise.all([
      manager.find(AcuerdoActa, {
        where: { idActa: In(actas.map((acta) => acta.idActa)) },
        order: { idAcuerdo: 'ASC' },
      }),
      nombresPorId(
        manager,
        actas.map((acta) => acta.creadaPor),
      ),
    ]);
    return actas.map((acta) => ({
      idActa: acta.idActa,
      numero: acta.numero,
      titulo: acta.titulo,
      tipo: acta.tipoReunion,
      fecha: acta.fechaAsamblea,
      lugar: acta.lugar,
      unidadesPresentes: acta.unidadesPresentes,
      asistentes: acta.asistentes,
      temas: acta.temas,
      estado: acta.publicada ? 'Publicada' : 'Borrador',
      publicadaEn: acta.publicadaEn,
      redactor:
        acta.creadaPor === null
          ? null
          : {
              idUsuario: acta.creadaPor,
              nombre: nombres.get(acta.creadaPor) ?? null,
            },
      acuerdos: acuerdos
        .filter((acuerdo) => acuerdo.idActa === acta.idActa)
        .map((acuerdo) => ({
          idAcuerdo: acuerdo.idAcuerdo,
          texto: acuerdo.texto,
          responsable: acuerdo.responsable,
          plazo: acuerdo.plazo,
        })),
    }));
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idActa: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'actas',
        idEntidad: idActa,
        detalle,
      },
      manager,
    );
  }
}

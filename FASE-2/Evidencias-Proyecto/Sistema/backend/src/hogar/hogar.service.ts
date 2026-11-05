import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { mesesEntre, sumarMeses } from '../common/utils/fechas';
import { fechaHoy } from '../common/utils/vigencia';
import { Unidad } from '../unidades/entities/unidad.entity';
import { GuardarFichaDto } from './dto/guardar-ficha.dto';
import { HogarFicha, TipoFicha } from './entities/hogar-ficha.entity';
import { MAX_FICHAS_POR_UNIDAD } from './reglas-ficha';

const MESES_MANTENCION_POR_DEFECTO = 12;

@Injectable()
export class HogarService {
  constructor(
    @InjectRepository(HogarFicha)
    private readonly fichasRepository: Repository<HogarFicha>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(idUnidad: number, red: ContextoRed) {
    this.exigirUnidadPropia(idUnidad, red);
    const fichas = await this.fichasRepository.find({
      where: { idUnidad },
      relations: { creador: true },
      order: { idFicha: 'ASC' },
    });
    return fichas.map((ficha) => this.serializar(ficha));
  }

  async crear(
    idUnidad: number,
    red: ContextoRed,
    idUsuario: number,
    dto: GuardarFichaDto,
  ) {
    this.exigirUnidadPropia(idUnidad, red);
    const idFicha = await this.dataSource.transaction(async (manager) => {
      await manager.findOne(Unidad, {
        where: { idUnidad },
        lock: { mode: 'pessimistic_write' },
      });
      const total = await manager.count(HogarFicha, { where: { idUnidad } });
      if (total >= MAX_FICHAS_POR_UNIDAD) {
        throw new ConflictException(
          `La unidad ya tiene el máximo de ${MAX_FICHAS_POR_UNIDAD} fichas`,
        );
      }
      const { identifiers } = await manager.insert(HogarFicha, {
        ...this.camposEditables(dto),
        idUnidad,
        creadoPor: idUsuario,
      });
      return identifiers[0].idFicha as number;
    });
    return this.serializar(await this.buscarPropia(idFicha, red));
  }

  async actualizar(idFicha: number, red: ContextoRed, dto: GuardarFichaDto) {
    const ficha = await this.buscarPropia(idFicha, red);
    await this.fichasRepository.update(
      { idFicha: ficha.idFicha, fechaEliminacion: IsNull() },
      this.camposEditables(dto),
    );
    return this.serializar(await this.buscarPropia(idFicha, red));
  }

  async registrarMantencion(idFicha: number, red: ContextoRed) {
    const ficha = await this.buscarPropia(idFicha, red);
    if (ficha.tipo !== TipoFicha.MANTENCION) {
      throw new BadRequestException(
        'Solo las fichas de tipo Mantención registran mantenciones',
      );
    }
    const meses =
      ficha.fecha && ficha.fechaVence
        ? Math.max(1, mesesEntre(ficha.fecha, ficha.fechaVence))
        : MESES_MANTENCION_POR_DEFECTO;
    const hoy = fechaHoy();
    await this.fichasRepository.update(
      {
        idFicha: ficha.idFicha,
        tipo: TipoFicha.MANTENCION,
        fechaEliminacion: IsNull(),
      },
      { fecha: hoy, fechaVence: sumarMeses(hoy, meses) },
    );
    return this.serializar(await this.buscarPropia(idFicha, red));
  }

  async eliminar(idFicha: number, red: ContextoRed): Promise<void> {
    const ficha = await this.buscarPropia(idFicha, red);
    await this.fichasRepository.softDelete({ idFicha: ficha.idFicha });
  }

  private exigirUnidadPropia(idUnidad: number, red: ContextoRed) {
    if (!red.idsUnidades.includes(idUnidad)) {
      throw new NotFoundException('Unidad no encontrada');
    }
  }

  private async buscarPropia(idFicha: number, red: ContextoRed) {
    const ficha =
      red.idsUnidades.length === 0
        ? null
        : await this.fichasRepository.findOne({
            where: { idFicha, idUnidad: In(red.idsUnidades) },
            relations: { creador: true },
          });
    if (!ficha) {
      throw new NotFoundException('Ficha no encontrada');
    }
    return ficha;
  }

  private camposEditables(dto: GuardarFichaDto) {
    return {
      tipo: dto.tipo,
      titulo: dto.titulo,
      detalle: dto.detalle ?? null,
      contactoNombre: dto.contactoNombre ?? null,
      contactoTelefono: dto.contactoTelefono ?? null,
      fecha: dto.fecha ?? null,
      fechaVence: dto.fechaVence ?? null,
    };
  }

  private serializar(ficha: HogarFicha) {
    return {
      idFicha: ficha.idFicha,
      idUnidad: ficha.idUnidad,
      tipo: ficha.tipo,
      titulo: ficha.titulo,
      detalle: ficha.detalle,
      contactoNombre: ficha.contactoNombre,
      contactoTelefono: ficha.contactoTelefono,
      fecha: ficha.fecha,
      fechaVence: ficha.fechaVence,
      creadoPor: ficha.creador
        ? { idUsuario: ficha.creador.idUsuario, nombre: ficha.creador.nombre }
        : null,
      fechaCreacion: ficha.fechaCreacion,
      fechaActualizacion: ficha.fechaActualizacion,
    };
  }
}

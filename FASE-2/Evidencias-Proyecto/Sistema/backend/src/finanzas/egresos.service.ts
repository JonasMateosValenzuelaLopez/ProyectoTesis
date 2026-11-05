import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { DecidirDto } from '../common/dto/decidir.dto';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { RegistrarEgresoDto } from './dto/egresos-exenciones.dto';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { Egreso, EstadoVisado } from './entities/egreso.entity';

@Injectable()
export class EgresosService {
  constructor(
    @InjectRepository(Egreso)
    private readonly egresosRepository: Repository<Egreso>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const egresos = await this.egresosRepository.find({
      where: { idRed: red.idRed },
      relations: { categoria: true },
      order: { fechaEgreso: 'DESC', idEgreso: 'DESC' },
    });
    const nombre = await nombresPorId(
      this.dataSource.manager,
      egresos.flatMap((egreso) => [egreso.creadoPor, egreso.visadoPor]),
    );
    return egresos.map((egreso) => this.serializar(egreso, nombre));
  }

  async registrar(
    red: ContextoRed,
    idUsuario: number,
    dto: RegistrarEgresoDto,
  ) {
    const idEgreso = await this.dataSource.transaction(async (manager) => {
      const categoria = await manager.findOne(CategoriaGasto, {
        where: { idCategoria: dto.idCategoria, idRed: red.idRed },
      });
      if (!categoria?.activa) {
        throw new BadRequestException(
          'La categoría no existe o está desactivada',
        );
      }
      const comunidad = await manager.findOneByOrFail(RedVecinal, {
        idRed: red.idRed,
      });
      const requiereVisado = dto.monto >= comunidad.umbralVisado;
      const { identifiers } = await manager.insert(Egreso, {
        idRed: red.idRed,
        idCategoria: categoria.idCategoria,
        monto: dto.monto,
        descripcion: dto.descripcion,
        proveedor: dto.proveedor ?? null,
        fechaEgreso: dto.fechaEgreso,
        comprobanteUrl: dto.comprobanteUrl ?? null,
        requiereVisado,
        estadoVisado: requiereVisado
          ? EstadoVisado.PENDIENTE
          : EstadoVisado.NO_REQUIERE,
        creadoPor: idUsuario,
      });
      const id = identifiers[0].idEgreso as number;
      await this.registrarBitacora(
        red,
        idUsuario,
        'registrar_egreso',
        id,
        {
          descripcion: dto.descripcion,
          monto: dto.monto,
          requiereVisado,
        },
        manager,
      );
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idEgreso);
  }

  async visar(
    red: ContextoRed,
    idUsuario: number,
    idEgreso: number,
    dto: DecidirDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      const egreso = await manager.findOne(Egreso, {
        where: { idEgreso, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!egreso) {
        throw new NotFoundException('Egreso no encontrado');
      }
      if (egreso.estadoVisado !== EstadoVisado.PENDIENTE) {
        throw new ConflictException(
          'Este egreso no está esperando el visado de la Presidencia',
        );
      }
      await manager.update(
        Egreso,
        { idEgreso, idRed: red.idRed },
        {
          estadoVisado: dto.aprobado
            ? EstadoVisado.APROBADO
            : EstadoVisado.RECHAZADO,
          visadoPor: idUsuario,
          visadoEn: new Date(),
        },
      );
      await this.registrarBitacora(
        red,
        idUsuario,
        dto.aprobado ? 'visar_egreso' : 'rechazar_egreso',
        idEgreso,
        {
          descripcion: egreso.descripcion,
          monto: egreso.monto,
          comentario: dto.comentario ?? null,
        },
        manager,
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.detalle(red, idEgreso);
  }

  private async detalle(red: ContextoRed, idEgreso: number) {
    const egreso = await this.egresosRepository.findOne({
      where: { idEgreso, idRed: red.idRed },
      relations: { categoria: true },
    });
    if (!egreso) {
      throw new NotFoundException('Egreso no encontrado');
    }
    return this.serializar(
      egreso,
      await nombresPorId(this.dataSource.manager, [
        egreso.creadoPor,
        egreso.visadoPor,
      ]),
    );
  }

  private registrarBitacora(
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idEgreso: number,
    detalle: Record<string, unknown>,
    manager = this.dataSource.manager,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'egresos',
        idEntidad: idEgreso,
        detalle,
      },
      manager,
    );
  }

  private serializar(egreso: Egreso, nombre: Map<number, string>) {
    const persona = (id: number | null) =>
      id === null ? null : { idUsuario: id, nombre: nombre.get(id) ?? null };
    return {
      idEgreso: egreso.idEgreso,
      categoria: egreso.categoria
        ? {
            idCategoria: egreso.categoria.idCategoria,
            nombre: egreso.categoria.nombre,
          }
        : null,
      monto: egreso.monto,
      descripcion: egreso.descripcion,
      proveedor: egreso.proveedor,
      fechaEgreso: egreso.fechaEgreso,
      comprobanteUrl: egreso.comprobanteUrl,
      requiereVisado: egreso.requiereVisado,
      estadoVisado: egreso.estadoVisado,
      visadoPor: persona(egreso.visadoPor),
      visadoEn: egreso.visadoEn,
      creadoPor: persona(egreso.creadoPor),
      fechaCreacion: egreso.fechaCreacion,
    };
  }
}

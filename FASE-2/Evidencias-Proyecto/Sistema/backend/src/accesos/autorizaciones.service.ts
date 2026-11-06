import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThan, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { DecisionAccesoDto } from './dto/accesos.dto';
import {
  EstadoAutorizacion,
  RegistroAcceso,
  ViaAutorizacion,
} from './entities/registro-acceso.entity';
import {
  conflictoDeResolucion,
  nombresDeAccesos,
  serializarAcceso,
} from './presentacion-accesos';
import { decisionAcceso, limitePendiente } from './reglas-accesos';

@Injectable()
export class AutorizacionesService {
  constructor(
    @InjectRepository(RegistroAcceso)
    private readonly accesosRepository: Repository<RegistroAcceso>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async pendientes(red: ContextoRed) {
    if (red.idsUnidades.length === 0) {
      return { porAutorizar: [] };
    }
    const accesos = await this.accesosRepository.find({
      where: {
        idRed: red.idRed,
        idUnidad: In(red.idsUnidades),
        estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
        fechaCreacion: MoreThan(limitePendiente()),
      },
      relations: { visitante: true, unidad: true },
      order: { idAcceso: 'ASC' },
    });
    const nombres = await nombresDeAccesos(this.dataSource.manager, accesos);
    return { porAutorizar: accesos.map((a) => serializarAcceso(a, nombres)) };
  }

  async responder(
    red: ContextoRed,
    idUsuario: number,
    idAcceso: number,
    dto: DecisionAccesoDto,
  ) {
    if (red.idsUnidades.length === 0) {
      throw new NotFoundException('Ingreso no encontrado');
    }
    const ahora = new Date();
    const propio = {
      idAcceso,
      idRed: red.idRed,
      idUnidad: In(red.idsUnidades),
    };
    const { affected } = await this.accesosRepository.update(
      {
        ...propio,
        estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
        fechaCreacion: MoreThan(limitePendiente(ahora)),
        fechaEliminacion: IsNull(),
      },
      {
        ...decisionAcceso(dto.aprobado, ViaAutorizacion.APP, ahora),
        autorizadoPor: idUsuario,
      },
    );
    if (!affected) {
      const actual = await this.accesosRepository.findOne({ where: propio });
      if (!actual) {
        throw new NotFoundException('Ingreso no encontrado');
      }
      throw conflictoDeResolucion(actual);
    }
    await this.bitacoraService.marcarActividad(red.idRed);
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

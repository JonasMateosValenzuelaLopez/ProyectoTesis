import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { cargosVigentesPorUsuario } from '../usuarios/cargos-vigentes';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { nombresPorId } from '../usuarios/nombres-por-id';
import { ListarBitacoraDto } from './dto/listar-bitacora.dto';
import {
  AmbitoBitacora,
  BitacoraAuditoria,
} from './entities/bitacora-auditoria.entity';
import { textoAccion } from './textos-bitacora';

const LIMITE_POR_DEFECTO = 50;

@Injectable()
export class BitacoraComunidadService {
  constructor(
    @InjectRepository(BitacoraAuditoria)
    private readonly bitacoraRepository: Repository<BitacoraAuditoria>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(red: ContextoRed, filtro: ListarBitacoraDto) {
    const manager = this.dataSource.manager;
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    let autores: number[] | null = null;
    if (filtro.rol) {
      const membresias = await manager.find(Membresia, {
        select: { idUsuario: true },
        where: { idRed: red.idRed, idRol: filtro.rol },
        withDeleted: true,
      });
      autores = [...new Set(membresias.map((m) => m.idUsuario))];
      if (autores.length === 0) {
        return { registros: [], siguiente: null };
      }
    }
    const filas = await this.bitacoraRepository.find({
      where: {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        ...(autores ? { idUsuario: In(autores) } : {}),
        ...(filtro.antesDe ? { idBitacora: LessThan(filtro.antesDe) } : {}),
      },
      order: { idBitacora: 'DESC' },
      take: limite + 1,
    });
    const registros = filas.slice(0, limite);
    const ids = registros.map((registro) => registro.idUsuario);
    const [nombres, cargos] = await Promise.all([
      nombresPorId(manager, ids),
      cargosVigentesPorUsuario(manager, red.idRed, ids),
    ]);
    return {
      registros: registros.map((registro) => ({
        idBitacora: registro.idBitacora,
        fecha: registro.fechaCreacion,
        accion: registro.accion,
        descripcion: textoAccion(registro.accion),
        entidad: registro.entidad,
        idEntidad: registro.idEntidad,
        detalle: registro.detalle,
        usuario:
          registro.idUsuario === null
            ? null
            : {
                idUsuario: registro.idUsuario,
                nombre: nombres.get(registro.idUsuario) ?? null,
                cargo: cargos.get(registro.idUsuario) ?? null,
              },
      })),
      siguiente:
        filas.length > limite
          ? registros[registros.length - 1].idBitacora
          : null,
    };
  }
}

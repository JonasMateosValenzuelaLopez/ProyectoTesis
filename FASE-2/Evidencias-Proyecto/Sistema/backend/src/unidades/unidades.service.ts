import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { nombreCompleto } from '../common/utils/nombres';
import { condicionVigente } from '../common/utils/vigencia';
import {
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CrearLoteUnidadesDto, EditarUnidadDto } from './dto/unidades.dto';
import { Unidad } from './entities/unidad.entity';
import { errorLote, generarLote } from './lote-unidades';

const claveUnidad = (unidad: {
  torre: string | null;
  numeroIdentificador: string;
}) => `${unidad.torre ?? ''}|${unidad.numeroIdentificador}`;

@Injectable()
export class UnidadesService {
  constructor(
    @InjectRepository(Unidad)
    private readonly unidadesRepository: Repository<Unidad>,
    @InjectRepository(Residencia)
    private readonly residenciasRepository: Repository<Residencia>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const [unidades, residencias, membresias] = await Promise.all([
      this.unidadesRepository.find({
        where: { idRed: red.idRed },
        order: { orden: 'ASC', idUnidad: 'ASC' },
      }),
      this.residenciasRepository.find({
        where: { unidad: { idRed: red.idRed }, ...condicionVigente() },
        relations: { usuario: true },
        order: { idResidencia: 'ASC' },
      }),
      this.membresiasRepository.find({
        select: { idUsuario: true },
        where: { idRed: red.idRed, activo: true, ...condicionVigente() },
      }),
    ]);
    const conAcceso = new Set(membresias.map((m) => m.idUsuario));
    const ocupantes = new Map<number, Residencia[]>();
    for (const residencia of residencias) {
      if (residencia.usuario && conAcceso.has(residencia.idUsuario)) {
        ocupantes.set(residencia.idUnidad, [
          ...(ocupantes.get(residencia.idUnidad) ?? []),
          residencia,
        ]);
      }
    }
    return unidades.map((unidad) => ({
      ...this.serializar(unidad),
      ocupantes: (ocupantes.get(unidad.idUnidad) ?? []).map((residencia) => ({
        idUsuario: residencia.idUsuario,
        nombre: nombreCompleto(residencia.usuario),
        tipoResidencia: residencia.tipo,
      })),
    }));
  }

  async crearLote(
    red: ContextoRed,
    idUsuario: number,
    dto: CrearLoteUnidadesDto,
  ) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const comunidad = await manager.findOne(RedVecinal, {
        where: { idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!comunidad) {
        throw new NotFoundException('Comunidad no encontrada');
      }
      const lote =
        comunidad.tipo === TipoRedVecinal.VILLA && dto.grupo
          ? { ...dto, grupo: dto.grupo.toUpperCase() }
          : dto;
      const error = errorLote(comunidad.tipo, lote);
      if (error) {
        throw new BadRequestException(error);
      }

      const generadas = generarLote(comunidad.tipo, lote);
      const existentes = await manager.find(Unidad, {
        select: { torre: true, numeroIdentificador: true },
        where: {
          idRed: red.idRed,
          numeroIdentificador: In(generadas.map((u) => u.numeroIdentificador)),
        },
        withDeleted: true,
      });
      const ocupadas = new Set(existentes.map(claveUnidad));
      const nuevas = generadas.filter((u) => !ocupadas.has(claveUnidad(u)));
      const omitidas = generadas
        .filter((u) => ocupadas.has(claveUnidad(u)))
        .map((u) => u.numeroIdentificador);
      if (nuevas.length === 0) {
        return { ids: [], omitidas };
      }

      const { maximo } = (await manager
        .createQueryBuilder(Unidad, 'unidad')
        .select('MAX(unidad.orden)', 'maximo')
        .where('unidad.idRed = :idRed', { idRed: red.idRed })
        .withDeleted()
        .getRawOne<{ maximo: number | null }>()) ?? { maximo: null };
      const ultimoOrden = Number(maximo ?? 0);
      const { identifiers } = await manager.insert(
        Unidad,
        nuevas.map((unidad, indice) => ({
          ...unidad,
          idRed: red.idRed,
          orden: ultimoOrden + indice + 1,
        })),
      );
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: 'crear_unidades',
          entidad: 'unidades',
          detalle: {
            cantidad: nuevas.length,
            desde: nuevas[0].numeroIdentificador,
            hasta: nuevas[nuevas.length - 1].numeroIdentificador,
            grupo: nuevas[0].callePasaje,
            omitidas: omitidas.length,
          },
        },
        manager,
      );
      return {
        ids: identifiers.map((fila) => fila.idUnidad as number),
        omitidas,
      };
    });

    if (resultado.ids.length) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    const creadas = resultado.ids.length
      ? await this.unidadesRepository.find({
          where: { idUnidad: In(resultado.ids), idRed: red.idRed },
          order: { orden: 'ASC' },
        })
      : [];
    return {
      creadas: creadas.map((unidad) => this.serializar(unidad)),
      omitidas: resultado.omitidas,
    };
  }

  async editar(
    red: ContextoRed,
    idUsuario: number,
    idUnidad: number,
    dto: EditarUnidadDto,
  ) {
    const cambiada = await this.dataSource.transaction(async (manager) => {
      const unidad = await manager.findOne(Unidad, {
        where: { idUnidad, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!unidad) {
        throw new NotFoundException('Unidad no encontrada');
      }
      if (unidad.numeroIdentificador === dto.numeroIdentificador) {
        return false;
      }
      const repetida = await manager.exists(Unidad, {
        where: {
          idRed: red.idRed,
          torre: unidad.torre ?? IsNull(),
          numeroIdentificador: dto.numeroIdentificador,
        },
        withDeleted: true,
      });
      if (repetida) {
        throw new ConflictException(
          unidad.torre
            ? `Ya existe el departamento ${dto.numeroIdentificador} en la Torre ${unidad.torre}`
            : `Ya existe la unidad ${dto.numeroIdentificador} en esta comunidad`,
        );
      }
      await manager.update(
        Unidad,
        { idUnidad, idRed: red.idRed },
        { numeroIdentificador: dto.numeroIdentificador },
      );
      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: 'editar_unidad',
          entidad: 'unidades',
          idEntidad: idUnidad,
          detalle: {
            anterior: unidad.numeroIdentificador,
            nuevo: dto.numeroIdentificador,
          },
        },
        manager,
      );
      return true;
    });

    if (cambiada) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    const unidad = await this.unidadesRepository.findOneOrFail({
      where: { idUnidad, idRed: red.idRed },
    });
    return this.serializar(unidad);
  }

  private serializar(unidad: Unidad) {
    return {
      idUnidad: unidad.idUnidad,
      numeroIdentificador: unidad.numeroIdentificador,
      tipo: unidad.tipo,
      callePasaje: unidad.callePasaje,
      torre: unidad.torre,
      piso: unidad.piso,
      manzana: unidad.manzana,
      orden: unidad.orden,
      estacionamiento: unidad.estacionamiento,
    };
  }
}

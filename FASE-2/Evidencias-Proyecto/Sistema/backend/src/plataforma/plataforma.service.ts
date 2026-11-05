import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { nombreCompleto } from '../common/utils/nombres';
import { condicionVigente } from '../common/utils/vigencia';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import {
  EstadoRedVecinal,
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

const CARGOS_RESPONSABLE = [RolUsuario.ADMINISTRADOR, RolUsuario.PRESIDENTE];

@Injectable()
export class PlataformaService {
  constructor(
    @InjectRepository(RedVecinal)
    private readonly redesRepository: Repository<RedVecinal>,
    @InjectRepository(Unidad)
    private readonly unidadesRepository: Repository<Unidad>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    @InjectRepository(RedModulo)
    private readonly redModulosRepository: Repository<RedModulo>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar() {
    const redes = await this.redesRepository.find({
      order: { nombre: 'ASC', idRed: 'ASC' },
    });
    return this.resumir(redes);
  }

  async ficha(idRed: number, idUsuario: number) {
    const red = await this.buscarRed(idRed);
    const [[resumen], unidades, membresias] = await Promise.all([
      this.resumir([red]),
      this.unidadesRepository.find({
        where: { idRed },
        order: { orden: 'ASC', idUnidad: 'ASC' },
      }),
      this.membresiasVigentes([idRed]),
    ]);
    await this.registrar(
      this.dataSource.manager,
      idUsuario,
      idRed,
      'abrir_ficha_comunidad',
    );
    return {
      ...resumen,
      unidades: unidades.map((unidad) => ({
        idUnidad: unidad.idUnidad,
        numeroIdentificador: unidad.numeroIdentificador,
        tipo: unidad.tipo,
        callePasaje: unidad.callePasaje,
        torre: unidad.torre,
        piso: unidad.piso,
        manzana: unidad.manzana,
        orden: unidad.orden,
      })),
      directiva: this.directiva(membresias),
    };
  }

  async suspender(idRed: number, idUsuario: number, motivo: string) {
    await this.dataSource.transaction(async (manager) => {
      const red = await this.bloquearRed(manager, idRed);
      if (red.estado === EstadoRedVecinal.SUSPENDIDA) {
        throw new ConflictException('La comunidad ya está suspendida');
      }
      await manager.update(
        RedVecinal,
        { idRed },
        { estado: EstadoRedVecinal.SUSPENDIDA, motivoSuspension: motivo },
      );
      await this.registrar(manager, idUsuario, idRed, 'suspender_comunidad', {
        motivo,
      });
    });
    return this.resumenDe(idRed);
  }

  async reactivar(idRed: number, idUsuario: number) {
    await this.dataSource.transaction(async (manager) => {
      const red = await this.bloquearRed(manager, idRed);
      if (red.estado === EstadoRedVecinal.ACTIVA) {
        throw new ConflictException('La comunidad ya está activa');
      }
      await manager.update(
        RedVecinal,
        { idRed },
        { estado: EstadoRedVecinal.ACTIVA, motivoSuspension: null },
      );
      await this.registrar(manager, idUsuario, idRed, 'reactivar_comunidad', {
        motivoAnterior: red.motivoSuspension,
      });
    });
    return this.resumenDe(idRed);
  }

  async cambiarModulo(
    idRed: number,
    idUsuario: number,
    codigoModulo: CodigoModulo,
    activo: boolean,
  ) {
    await this.dataSource.transaction(async (manager) => {
      await this.bloquearRed(manager, idRed);
      const actual = await manager.findOne(RedModulo, {
        where: { idRed, codigoModulo },
        withDeleted: true,
      });
      const estabaActivo = Boolean(
        actual && !actual.fechaEliminacion && actual.activo,
      );
      if (estabaActivo === activo) {
        return;
      }
      if (!actual) {
        await manager.insert(RedModulo, {
          idRed,
          codigoModulo,
          activo,
          actualizadoPor: idUsuario,
        });
      } else {
        if (actual.fechaEliminacion) {
          await manager.restore(RedModulo, { idRed, codigoModulo });
        }
        await manager.update(
          RedModulo,
          { idRed, codigoModulo },
          { activo, actualizadoPor: idUsuario },
        );
      }
      await this.registrar(
        manager,
        idUsuario,
        idRed,
        activo ? 'activar_modulo' : 'desactivar_modulo',
        { modulo: codigoModulo },
        'red_modulos',
      );
    });
    return this.resumenDe(idRed);
  }

  async cambiarTipo(idRed: number, idUsuario: number, tipo: TipoRedVecinal) {
    await this.dataSource.transaction(async (manager) => {
      const red = await this.bloquearRed(manager, idRed);
      if (red.tipo === tipo) {
        return;
      }
      await manager.update(RedVecinal, { idRed }, { tipo });
      await this.registrar(
        manager,
        idUsuario,
        idRed,
        'cambiar_tipo_comunidad',
        { anterior: red.tipo, nuevo: tipo },
      );
    });
    return this.resumenDe(idRed);
  }

  private async resumenDe(idRed: number) {
    const [resumen] = await this.resumir([await this.buscarRed(idRed)]);
    return resumen;
  }

  private async buscarRed(idRed: number) {
    const red = await this.redesRepository.findOne({ where: { idRed } });
    if (!red) {
      throw new NotFoundException('Comunidad no encontrada');
    }
    return red;
  }

  private async bloquearRed(manager: EntityManager, idRed: number) {
    const red = await manager.findOne(RedVecinal, {
      where: { idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!red) {
      throw new NotFoundException('Comunidad no encontrada');
    }
    return red;
  }

  private async resumir(redes: RedVecinal[]) {
    if (redes.length === 0) {
      return [];
    }
    const ids = redes.map((red) => red.idRed);
    const [conteos, membresias, modulos] = await Promise.all([
      this.unidadesRepository
        .createQueryBuilder('unidad')
        .select('unidad.idRed', 'idRed')
        .addSelect('COUNT(*)', 'total')
        .where({ idRed: In(ids) })
        .groupBy('unidad.idRed')
        .getRawMany<{ idRed: number; total: string }>(),
      this.membresiasVigentes(ids),
      this.redModulosRepository.find({
        where: { idRed: In(ids), activo: true },
        order: { codigoModulo: 'ASC' },
      }),
    ]);
    const unidadesPorRed = new Map(
      conteos.map((fila) => [Number(fila.idRed), Number(fila.total)]),
    );

    return redes.map((red) => {
      const deLaRed = membresias.filter(
        (membresia) => membresia.idRed === red.idRed,
      );
      return {
        idRed: red.idRed,
        nombre: red.nombre,
        tipo: red.tipo,
        direccion: red.direccion,
        estado: red.estado,
        motivoSuspension: red.motivoSuspension,
        fechaCreacion: red.fechaCreacion,
        ultimaActividad: red.ultimaActividad,
        totalUnidades: unidadesPorRed.get(red.idRed) ?? 0,
        totalPersonas: new Set(deLaRed.map((membresia) => membresia.idUsuario))
          .size,
        modulos: modulos
          .filter((modulo) => modulo.idRed === red.idRed)
          .map((modulo) => modulo.codigoModulo),
        responsable: this.responsable(deLaRed),
      };
    });
  }

  private async membresiasVigentes(ids: number[]) {
    const membresias = await this.membresiasRepository.find({
      where: { idRed: In(ids), activo: true, ...condicionVigente() },
      relations: { usuario: true },
      order: { idRol: 'ASC', idMembresia: 'ASC' },
    });
    return membresias.filter((membresia) => membresia.usuario);
  }

  private responsable(membresias: Membresia[]) {
    for (const cargo of CARGOS_RESPONSABLE) {
      const membresia = membresias.find((m) => m.idRol === cargo);
      if (membresia) {
        return {
          ...this.persona(membresia.usuario),
          cargo: NOMBRE_ROL[cargo],
        };
      }
    }
    return null;
  }

  private directiva(membresias: Membresia[]) {
    const porUsuario = new Map<
      number,
      ReturnType<PlataformaService['persona']> & { cargos: string[] }
    >();
    for (const membresia of membresias) {
      if (membresia.idRol === RolUsuario.RESIDENTE) {
        continue;
      }
      const persona = porUsuario.get(membresia.idUsuario) ?? {
        ...this.persona(membresia.usuario),
        cargos: [],
      };
      persona.cargos.push(NOMBRE_ROL[membresia.idRol]);
      porUsuario.set(membresia.idUsuario, persona);
    }
    return [...porUsuario.values()];
  }

  private persona(usuario: Usuario) {
    return {
      idUsuario: usuario.idUsuario,
      nombre: nombreCompleto(usuario),
      pais: usuario.pais,
      identificador: usuario.identificador,
      correo: usuario.correo,
    };
  }

  private registrar(
    manager: EntityManager,
    idUsuario: number,
    idRed: number,
    accion: string,
    detalle?: Record<string, unknown>,
    entidad = 'redes_vecinales',
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.PLATAFORMA,
        idRed,
        idUsuario,
        accion,
        entidad,
        idEntidad: idRed,
        detalle,
      },
      manager,
    );
  }
}

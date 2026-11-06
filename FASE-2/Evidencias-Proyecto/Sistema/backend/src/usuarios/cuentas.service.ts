import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager, In, IsNull, Not } from 'typeorm';
import { RolUsuario } from '../common/enums/rol.enum';
import { condicionVigente, fechaHoy } from '../common/utils/vigencia';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from './entities/membresia.entity';
import { Residencia, TipoResidencia } from './entities/residencia.entity';
import { Usuario } from './entities/usuario.entity';

export interface DatosPersona {
  pais: string;
  identificador: string;
  nombre: string;
  primerApellido: string;
  segundoApellido?: string | null;
  correo: string;
  telefono?: string | null;
}

export interface MensajesCuenta {
  correoAjeno: string;
  bloqueada: string;
}

@Injectable()
export class CuentasService {
  async obtenerOCrear(
    manager: EntityManager,
    datos: DatosPersona,
    mensajes: MensajesCuenta,
  ): Promise<{ usuario: Usuario; cuentaNueva: boolean }> {
    const porIdentificador = await manager.findOne(Usuario, {
      where: { pais: datos.pais, identificador: datos.identificador },
      withDeleted: true,
    });
    const porCorreo = await manager.findOne(Usuario, {
      where: { correo: datos.correo },
      withDeleted: true,
    });
    if (porCorreo && porCorreo.idUsuario !== porIdentificador?.idUsuario) {
      throw new ConflictException(mensajes.correoAjeno);
    }
    if (porIdentificador?.esPlataforma) {
      throw new ConflictException(
        'Una cuenta del equipo EntreCasas no puede tener cargos ni viviendas en una comunidad',
      );
    }
    if (porIdentificador?.bloqueado) {
      throw new ConflictException(mensajes.bloqueada);
    }
    if (porIdentificador) {
      if (porIdentificador.fechaEliminacion) {
        await manager.restore(Usuario, {
          idUsuario: porIdentificador.idUsuario,
        });
      }
      return { usuario: porIdentificador, cuentaNueva: false };
    }
    const usuario = await manager.save(
      manager.create(Usuario, {
        pais: datos.pais,
        identificador: datos.identificador,
        nombre: datos.nombre,
        primerApellido: datos.primerApellido,
        segundoApellido: datos.segundoApellido ?? null,
        correo: datos.correo,
        telefono: datos.telefono ?? null,
        passwordHash: null,
      }),
    );
    return { usuario, cuentaNueva: true };
  }

  async asignarMembresia(
    manager: EntityManager,
    idUsuario: number,
    idRed: number,
    idRol: RolUsuario,
    hasta: string | null = null,
  ) {
    const existente = await manager.findOne(Membresia, {
      where: { idUsuario, idRed, idRol },
      withDeleted: true,
    });
    const hoy = fechaHoy();
    if (!existente) {
      await manager.insert(Membresia, {
        idUsuario,
        idRed,
        idRol,
        activo: true,
        desde: hoy,
        hasta,
      });
      return;
    }
    if (existente.fechaEliminacion) {
      await manager.restore(Membresia, {
        idMembresia: existente.idMembresia,
      });
    }
    const terminada =
      Boolean(existente.fechaEliminacion) ||
      (existente.hasta !== null && existente.hasta < hoy);
    await manager.update(
      Membresia,
      { idMembresia: existente.idMembresia },
      { activo: true, hasta, ...(terminada ? { desde: hoy } : {}) },
    );
  }

  async asignarResidencia(
    manager: EntityManager,
    idUsuario: number,
    idUnidad: number,
    tipo: TipoResidencia,
  ) {
    const unidad = await manager.findOne(Unidad, {
      where: { idUnidad },
      lock: { mode: 'pessimistic_write' },
    });
    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada');
    }
    const vigente = await manager.findOne(Residencia, {
      where: { idUsuario, idUnidad, ...condicionVigente() },
    });
    if (vigente) {
      if (vigente.tipo !== tipo) {
        await manager.update(
          Residencia,
          { idResidencia: vigente.idResidencia },
          { tipo },
        );
      }
    } else {
      await manager.insert(Residencia, {
        idUsuario,
        idUnidad,
        tipo,
        desde: fechaHoy(),
        hasta: null,
      });
    }
    await this.asegurarTitular(manager, unidad.idRed, idUnidad);
  }

  async asegurarTitular(
    manager: EntityManager,
    idRed: number,
    idUnidad: number,
  ): Promise<number | null> {
    const residencias = await manager.find(Residencia, {
      select: { idResidencia: true, idUsuario: true, titular: true },
      where: { idUnidad, ...condicionVigente() },
      order: { idResidencia: 'ASC' },
    });
    const conAcceso = await this.conAcceso(
      manager,
      idRed,
      residencias.map((residencia) => residencia.idUsuario),
    );
    const habilitadas = residencias.filter((residencia) =>
      conAcceso.has(residencia.idUsuario),
    );
    if (
      habilitadas.length === 0 ||
      habilitadas.some((residencia) => residencia.titular === 1)
    ) {
      return null;
    }
    const [nueva] = habilitadas;
    await this.marcarTitular(manager, idUnidad, nueva.idResidencia);
    return nueva.idUsuario;
  }

  async marcarTitular(
    manager: EntityManager,
    idUnidad: number,
    idResidencia: number,
  ) {
    await manager.update(
      Residencia,
      { idUnidad, titular: 1, idResidencia: Not(idResidencia) },
      { titular: null },
    );
    const { affected } = await manager.update(
      Residencia,
      { idResidencia, idUnidad },
      { titular: 1 },
    );
    if (affected !== 1) {
      throw new NotFoundException('La residencia no es de esta vivienda');
    }
  }

  async conAcceso(
    manager: EntityManager,
    idRed: number,
    ids: number[],
  ): Promise<Set<number>> {
    if (ids.length === 0) {
      return new Set<number>();
    }
    const membresias = await manager.find(Membresia, {
      select: { idUsuario: true },
      where: {
        idRed,
        idUsuario: In(ids),
        activo: true,
        ...condicionVigente(),
      },
    });
    return new Set(membresias.map((membresia) => membresia.idUsuario));
  }

  tienePassword(manager: EntityManager, idUsuario: number) {
    return manager.exists(Usuario, {
      where: { idUsuario, passwordHash: Not(IsNull()) },
      withDeleted: true,
    });
  }

  async conPassword(manager: EntityManager, ids: number[]) {
    if (ids.length === 0) {
      return new Set<number>();
    }
    const usuarios = await manager.find(Usuario, {
      select: { idUsuario: true },
      where: { idUsuario: In(ids), passwordHash: Not(IsNull()) },
      withDeleted: true,
    });
    return new Set(usuarios.map((usuario) => usuario.idUsuario));
  }
}

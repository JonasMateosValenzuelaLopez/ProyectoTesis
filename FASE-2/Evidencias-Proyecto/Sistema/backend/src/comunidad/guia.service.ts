import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { GuardarGuiaDto } from './dto/guardar-guia.dto';
import { ComunidadGuia, DiaSemana } from './entities/comunidad-guia.entity';

const ORDEN_DIAS = Object.values(DiaSemana);

const CARGOS_FIRMA = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.SECRETARIO,
  RolUsuario.PRESIDENTE,
];

type CamposGuia = Pick<
  ComunidadGuia,
  | 'mensaje'
  | 'basuraDias'
  | 'basuraHorario'
  | 'basuraLugar'
  | 'reciclajeLugar'
  | 'reciclajeDetalle'
>;

@Injectable()
export class GuiaService {
  constructor(
    @InjectRepository(ComunidadGuia)
    private readonly guiasRepository: Repository<ComunidadGuia>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async obtener(red: ContextoRed) {
    const guia = await this.guiasRepository.findOne({
      where: { idRed: red.idRed },
      relations: { actualizador: true },
    });
    return this.serializar(red.idRed, guia);
  }

  async guardar(red: ContextoRed, idUsuario: number, dto: GuardarGuiaDto) {
    const campos = this.camposEditables(dto);
    const guardada = await this.dataSource.transaction(async (manager) => {
      await manager.findOne(RedVecinal, {
        where: { idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      const actual = await manager.findOne(ComunidadGuia, {
        where: { idRed: red.idRed },
        withDeleted: true,
      });
      const vigente = actual && !actual.fechaEliminacion ? actual : null;
      const cambiados = (Object.keys(campos) as (keyof CamposGuia)[]).filter(
        (campo) =>
          vigente
            ? this.comparable(vigente[campo]) !== this.comparable(campos[campo])
            : campos[campo] !== null,
      );
      if (vigente && cambiados.length === 0) {
        return false;
      }

      if (!actual) {
        await manager.insert(ComunidadGuia, {
          ...campos,
          idRed: red.idRed,
          actualizadoPor: idUsuario,
        });
      } else {
        if (actual.fechaEliminacion) {
          await manager.restore(ComunidadGuia, { idRed: red.idRed });
        }
        await manager.update(
          ComunidadGuia,
          { idRed: red.idRed },
          { ...campos, actualizadoPor: idUsuario },
        );
      }

      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario,
          accion: 'guardar_guia_comunidad',
          entidad: 'comunidad_guias',
          idEntidad: red.idRed,
          detalle: { campos: cambiados, nueva: !vigente },
        },
        manager,
      );
      return true;
    });

    if (guardada) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    return this.obtener(red);
  }

  private camposEditables(dto: GuardarGuiaDto): CamposGuia {
    const dias = this.ordenarDias(dto.basuraDias);
    return {
      mensaje: dto.mensaje ?? null,
      basuraDias: dias.length ? dias : null,
      basuraHorario: dto.basuraHorario ?? null,
      basuraLugar: dto.basuraLugar ?? null,
      reciclajeLugar: dto.reciclajeLugar ?? null,
      reciclajeDetalle: dto.reciclajeDetalle ?? null,
    };
  }

  private ordenarDias(dias: DiaSemana[] | null | undefined) {
    return ORDEN_DIAS.filter((dia) => dias?.includes(dia));
  }

  private comparable(valor: CamposGuia[keyof CamposGuia]) {
    return Array.isArray(valor)
      ? this.ordenarDias(valor).join(',') || null
      : valor;
  }

  private async cargoActual(idUsuario: number, idRed: number) {
    const membresias = await this.membresiasRepository.find({
      where: {
        idUsuario,
        idRed,
        activo: true,
        idRol: In(CARGOS_FIRMA),
        ...condicionVigente(),
      },
    });
    const cargo = CARGOS_FIRMA.find((rol) =>
      membresias.some((membresia) => membresia.idRol === rol),
    );
    return cargo ? NOMBRE_ROL[cargo] : null;
  }

  private async serializar(idRed: number, guia: ComunidadGuia | null) {
    const firma = guia?.actualizador
      ? {
          nombre: guia.actualizador.nombre,
          cargo: await this.cargoActual(guia.actualizador.idUsuario, idRed),
        }
      : null;
    return {
      mensaje: guia?.mensaje ?? null,
      basuraDias: this.ordenarDias(guia?.basuraDias),
      basuraHorario: guia?.basuraHorario ?? null,
      basuraLugar: guia?.basuraLugar ?? null,
      reciclajeLugar: guia?.reciclajeLugar ?? null,
      reciclajeDetalle: guia?.reciclajeDetalle ?? null,
      firma,
      fechaActualizacion: guia?.fechaActualizacion ?? null,
    };
  }
}

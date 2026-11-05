import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { GuardarContactoDto } from './dto/guardar-contacto.dto';
import { ComunidadContacto } from './entities/comunidad-contacto.entity';

export const EDITORES_CONTACTOS = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.SECRETARIO,
  RolUsuario.PRESIDENTE,
];

export const MAX_CONTACTOS_POR_COMUNIDAD = 100;

type CamposContacto = Pick<
  ComunidadContacto,
  'nombre' | 'detalle' | 'telefono' | 'horario' | 'visible'
>;

@Injectable()
export class ContactosService {
  constructor(
    @InjectRepository(ComunidadContacto)
    private readonly contactosRepository: Repository<ComunidadContacto>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const puedeEditar = red.roles.some((rol) =>
      EDITORES_CONTACTOS.includes(rol),
    );
    const contactos = await this.contactosRepository.find({
      where: { idRed: red.idRed, ...(puedeEditar ? {} : { visible: true }) },
      order: { idContacto: 'ASC' },
    });
    return contactos.map((contacto) => this.serializar(contacto));
  }

  async crear(red: ContextoRed, idUsuario: number, dto: GuardarContactoDto) {
    const campos = this.camposEditables(dto);
    const idContacto = await this.dataSource.transaction(async (manager) => {
      await manager.findOne(RedVecinal, {
        where: { idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      const total = await manager.count(ComunidadContacto, {
        where: { idRed: red.idRed },
      });
      if (total >= MAX_CONTACTOS_POR_COMUNIDAD) {
        throw new ConflictException(
          `La comunidad ya tiene el máximo de ${MAX_CONTACTOS_POR_COMUNIDAD} contactos`,
        );
      }
      const { identifiers } = await manager.insert(ComunidadContacto, {
        ...campos,
        idRed: red.idRed,
      });
      const id = identifiers[0].idContacto as number;
      await this.registrar(manager, red, idUsuario, 'crear_contacto', id, {
        nombre: campos.nombre,
      });
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.serializar(await this.buscar(idContacto, red));
  }

  async actualizar(
    red: ContextoRed,
    idUsuario: number,
    idContacto: number,
    dto: GuardarContactoDto,
  ) {
    const campos = this.camposEditables(dto);
    const actualizado = await this.dataSource.transaction(async (manager) => {
      const actual = await this.buscar(idContacto, red, manager);
      const cambiados = (
        Object.keys(campos) as (keyof CamposContacto)[]
      ).filter((campo) => actual[campo] !== campos[campo]);
      if (cambiados.length === 0) {
        return false;
      }
      await manager.update(
        ComunidadContacto,
        { idContacto, idRed: red.idRed },
        campos,
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        'actualizar_contacto',
        idContacto,
        { nombre: campos.nombre, campos: cambiados },
      );
      return true;
    });
    if (actualizado) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    return this.serializar(await this.buscar(idContacto, red));
  }

  async eliminar(
    red: ContextoRed,
    idUsuario: number,
    idContacto: number,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const contacto = await this.buscar(idContacto, red, manager);
      await manager.softDelete(ComunidadContacto, {
        idContacto,
        idRed: red.idRed,
      });
      await this.registrar(
        manager,
        red,
        idUsuario,
        'eliminar_contacto',
        idContacto,
        { nombre: contacto.nombre },
      );
    });
    await this.bitacoraService.marcarActividad(red.idRed);
  }

  private async buscar(
    idContacto: number,
    red: ContextoRed,
    manager?: EntityManager,
  ) {
    const contacto = manager
      ? await manager.findOne(ComunidadContacto, {
          where: { idContacto, idRed: red.idRed },
          lock: { mode: 'pessimistic_write' },
        })
      : await this.contactosRepository.findOne({
          where: { idContacto, idRed: red.idRed },
        });
    if (!contacto) {
      throw new NotFoundException('Contacto no encontrado');
    }
    return contacto;
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idContacto: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'comunidad_contactos',
        idEntidad: idContacto,
        detalle,
      },
      manager,
    );
  }

  private camposEditables(dto: GuardarContactoDto): CamposContacto {
    return {
      nombre: dto.nombre,
      detalle: dto.detalle ?? null,
      telefono: dto.telefono,
      horario: dto.horario ?? null,
      visible: dto.visible ?? true,
    };
  }

  private serializar(contacto: ComunidadContacto) {
    return {
      idContacto: contacto.idContacto,
      nombre: contacto.nombre,
      detalle: contacto.detalle,
      telefono: contacto.telefono,
      horario: contacto.horario,
      visible: contacto.visible,
    };
  }
}

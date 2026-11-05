import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { EditarCategoriaDto, GuardarCategoriaDto } from './dto/finanzas.dto';
import { CategoriaGasto } from './entities/categoria-gasto.entity';

@Injectable()
export class CategoriasService {
  constructor(
    @InjectRepository(CategoriaGasto)
    private readonly categoriasRepository: Repository<CategoriaGasto>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(red: ContextoRed) {
    const categorias = await this.categoriasRepository.find({
      where: { idRed: red.idRed },
      order: { nombre: 'ASC' },
    });
    return categorias.map((categoria) => this.serializar(categoria));
  }

  async crear(red: ContextoRed, idUsuario: number, dto: GuardarCategoriaDto) {
    const idCategoria = await this.dataSource.transaction(async (manager) => {
      await this.exigirNombreLibre(manager, red, dto.nombre);
      const { identifiers } = await manager.insert(CategoriaGasto, {
        idRed: red.idRed,
        nombre: dto.nombre,
        activa: true,
      });
      const id = identifiers[0].idCategoria as number;
      await this.registrar(manager, red, idUsuario, 'crear_categoria', id, {
        nombre: dto.nombre,
      });
      return id;
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.serializar(await this.buscar(red, idCategoria));
  }

  async editar(
    red: ContextoRed,
    idUsuario: number,
    idCategoria: number,
    dto: EditarCategoriaDto,
  ) {
    const cambiada = await this.dataSource.transaction(async (manager) => {
      const actual = await manager.findOne(CategoriaGasto, {
        where: { idCategoria, idRed: red.idRed },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual) {
        throw new NotFoundException('Categoría no encontrada');
      }
      const cambios: Partial<CategoriaGasto> = {};
      if (dto.nombre !== undefined && dto.nombre !== actual.nombre) {
        await this.exigirNombreLibre(manager, red, dto.nombre, idCategoria);
        cambios.nombre = dto.nombre;
      }
      if (dto.activa !== undefined && dto.activa !== actual.activa) {
        cambios.activa = dto.activa;
      }
      if (Object.keys(cambios).length === 0) {
        return false;
      }
      await manager.update(
        CategoriaGasto,
        { idCategoria, idRed: red.idRed },
        cambios,
      );
      await this.registrar(
        manager,
        red,
        idUsuario,
        'editar_categoria',
        idCategoria,
        { anterior: actual.nombre, ...cambios },
      );
      return true;
    });
    if (cambiada) {
      await this.bitacoraService.marcarActividad(red.idRed);
    }
    return this.serializar(await this.buscar(red, idCategoria));
  }

  private async exigirNombreLibre(
    manager: EntityManager,
    red: ContextoRed,
    nombre: string,
    excepto?: number,
  ) {
    const repetida = await manager.exists(CategoriaGasto, {
      where: {
        idRed: red.idRed,
        nombre,
        ...(excepto ? { idCategoria: Not(excepto) } : {}),
      },
      withDeleted: true,
    });
    if (repetida) {
      throw new ConflictException(`Ya existe la categoría «${nombre}»`);
    }
  }

  private async buscar(red: ContextoRed, idCategoria: number) {
    const categoria = await this.categoriasRepository.findOne({
      where: { idCategoria, idRed: red.idRed },
    });
    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }
    return categoria;
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
    accion: string,
    idCategoria: number,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario,
        accion,
        entidad: 'categorias_gasto',
        idEntidad: idCategoria,
        detalle,
      },
      manager,
    );
  }

  private serializar(categoria: CategoriaGasto) {
    return {
      idCategoria: categoria.idCategoria,
      nombre: categoria.nombre,
      activa: categoria.activa,
    };
  }
}

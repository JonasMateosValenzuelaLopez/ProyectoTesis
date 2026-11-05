import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Not } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { CategoriasService } from './categorias.service';
import { CategoriaGasto } from './entities/categoria-gasto.entity';

describe('CategoriasService', () => {
  let target: CategoriasService;
  let mockRepositorio: { find: jest.Mock; findOne: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    exists: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let categoriaEnBd: CategoriaGasto | null;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.TESORERO],
    modulos: [],
    idsUnidades: [],
  };

  beforeEach(async () => {
    categoriaEnBd = {
      idCategoria: 8,
      idRed: 3,
      nombre: 'Gasto común',
      activa: true,
    } as CategoriaGasto;
    mockRepositorio = {
      find: jest.fn().mockResolvedValue([categoriaEnBd]),
      findOne: jest.fn(() => Promise.resolve(categoriaEnBd)),
    };
    mockManager = {
      findOne: jest.fn(() => Promise.resolve(categoriaEnBd)),
      exists: jest.fn().mockResolvedValue(false),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idCategoria: 8 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        CategoriasService,
        {
          provide: getRepositoryToken(CategoriaGasto),
          useValue: mockRepositorio,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
          },
        },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(CategoriasService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe listar las categorías de la comunidad, también las desactivadas', async () => {
    const resultado = await target.listar(red);

    expect(mockRepositorio.find).toHaveBeenCalledWith({
      where: { idRed: 3 },
      order: { nombre: 'ASC' },
    });
    expect(resultado).toEqual([
      { idCategoria: 8, nombre: 'Gasto común', activa: true },
    ]);
  });

  it('debe crear una categoría activa y registrarla', async () => {
    await target.crear(red, 5, { nombre: 'Fondo de reserva' });

    expect(mockManager.insert).toHaveBeenCalledWith(CategoriaGasto, {
      idRed: 3,
      nombre: 'Fondo de reserva',
      activa: true,
    });
    expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'crear_categoria', idEntidad: 8 }),
      mockManager,
    );
  });

  it('debe rechazar un nombre repetido, también entre las eliminadas', async () => {
    mockManager.exists.mockResolvedValue(true);

    await expect(
      target.crear(red, 5, { nombre: 'Gasto común' }),
    ).rejects.toThrow(
      new ConflictException('Ya existe la categoría «Gasto común»'),
    );

    expect(mockManager.exists).toHaveBeenCalledWith(CategoriaGasto, {
      where: { idRed: 3, nombre: 'Gasto común' },
      withDeleted: true,
    });
  });

  it('debe desactivar una categoría', async () => {
    await target.editar(red, 5, 8, { activa: false });

    expect(mockManager.update).toHaveBeenCalledWith(
      CategoriaGasto,
      { idCategoria: 8, idRed: 3 },
      { activa: false },
    );
  });

  it('debe validar el nombre nuevo sin chocar con la misma categoría', async () => {
    await target.editar(red, 5, 8, { nombre: 'Gastos comunes' });

    expect(mockManager.exists).toHaveBeenCalledWith(CategoriaGasto, {
      where: { idRed: 3, nombre: 'Gastos comunes', idCategoria: Not(8) },
      withDeleted: true,
    });
  });

  it('no debe escribir cuando no cambia nada', async () => {
    await target.editar(red, 5, 8, { nombre: 'Gasto común', activa: true });

    expect(mockManager.update).not.toHaveBeenCalled();
    expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
  });

  it('debe responder 404 por una categoría de otra comunidad', async () => {
    categoriaEnBd = null;

    await expect(target.editar(red, 5, 99, { activa: false })).rejects.toThrow(
      new NotFoundException('Categoría no encontrada'),
    );
  });
});

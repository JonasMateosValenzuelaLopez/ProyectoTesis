import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, IsNull } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import {
  Residencia,
  TipoResidencia,
} from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CrearLoteUnidadesDto } from './dto/unidades.dto';
import { TipoUnidad, Unidad } from './entities/unidad.entity';
import { UnidadesService } from './unidades.service';

describe('UnidadesService', () => {
  let target: UnidadesService;
  let mockUnidadesRepository: { find: jest.Mock; findOneOrFail: jest.Mock };
  let mockResidenciasRepository: { find: jest.Mock };
  let mockMembresiasRepository: { find: jest.Mock };
  let mockConsulta: Record<string, jest.Mock>;
  let mockManager: {
    findOne: jest.Mock;
    find: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    exists: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let comunidad: RedVecinal | null;
  let unidadEnBd: Unidad | null;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.ADMINISTRADOR],
    modulos: [],
    idsUnidades: [],
  };

  const crearUnidad = (cambios: Partial<Unidad> = {}): Unidad =>
    ({
      idUnidad: 10,
      idRed: 3,
      numeroIdentificador: '5',
      tipo: TipoUnidad.CASA,
      callePasaje: 'Pasaje 1',
      torre: null,
      piso: null,
      manzana: null,
      orden: 5,
      estacionamiento: null,
      ...cambios,
    }) as Unidad;

  const residencia = (
    idUsuario: number,
    idUnidad: number,
    nombre: string,
    tipo = TipoResidencia.PROPIETARIO,
  ): Residencia =>
    ({
      idResidencia: idUsuario,
      idUsuario,
      idUnidad,
      tipo,
      usuario: {
        idUsuario,
        nombre,
        primerApellido: 'Soto',
        segundoApellido: null,
      } as Usuario,
    }) as Residencia;

  beforeEach(async () => {
    comunidad = { idRed: 3, tipo: TipoRedVecinal.CONDOMINIO } as RedVecinal;
    unidadEnBd = crearUnidad();
    mockUnidadesRepository = {
      find: jest.fn().mockResolvedValue([crearUnidad()]),
      findOneOrFail: jest.fn(() => Promise.resolve(unidadEnBd)),
    };
    mockResidenciasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockMembresiasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockConsulta = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maximo: 15 }),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === RedVecinal ? comunidad : unidadEnBd),
      ),
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn((_entidad: unknown, filas: unknown[]) =>
        Promise.resolve({
          identifiers: filas.map((_fila, i) => ({ idUnidad: 100 + i })),
        }),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      exists: jest.fn().mockResolvedValue(false),
      createQueryBuilder: jest.fn().mockReturnValue(mockConsulta),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        UnidadesService,
        {
          provide: getRepositoryToken(Unidad),
          useValue: mockUnidadesRepository,
        },
        {
          provide: getRepositoryToken(Residencia),
          useValue: mockResidenciasRepository,
        },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(UnidadesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe devolver las unidades de la comunidad con sus ocupantes vigentes', async () => {
      mockResidenciasRepository.find.mockResolvedValue([
        residencia(7, 10, 'Ana'),
        residencia(8, 10, 'Luis', TipoResidencia.ARRENDATARIO),
      ]);
      mockMembresiasRepository.find.mockResolvedValue([
        { idUsuario: 7 },
        { idUsuario: 8 },
      ]);

      const [unidad] = await target.listar(red);

      expect(mockUnidadesRepository.find).toHaveBeenCalledWith({
        where: { idRed: 3 },
        order: { orden: 'ASC', idUnidad: 'ASC' },
      });
      expect(unidad).toEqual({
        idUnidad: 10,
        numeroIdentificador: '5',
        tipo: TipoUnidad.CASA,
        callePasaje: 'Pasaje 1',
        torre: null,
        piso: null,
        manzana: null,
        orden: 5,
        estacionamiento: null,
        ocupantes: [
          {
            idUsuario: 7,
            nombre: 'Ana Soto',
            tipoResidencia: TipoResidencia.PROPIETARIO,
          },
          {
            idUsuario: 8,
            nombre: 'Luis Soto',
            tipoResidencia: TipoResidencia.ARRENDATARIO,
          },
        ],
      });
    });

    it('no debe mostrar como ocupante a quien fue desactivado en la comunidad', async () => {
      mockResidenciasRepository.find.mockResolvedValue([
        residencia(7, 10, 'Ana'),
      ]);
      mockMembresiasRepository.find.mockResolvedValue([]);

      const [unidad] = await target.listar(red);

      expect(unidad.ocupantes).toEqual([]);
    });

    it('debe buscar solo residencias vigentes de unidades de la comunidad', async () => {
      await target.listar(red);

      expect(mockResidenciasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ unidad: { idRed: 3 } }),
        }),
      );
    });
  });

  describe('crearLote', () => {
    const lote = {
      grupo: 'Pasaje 2',
      desde: 16,
      hasta: 18,
    } as CrearLoteUnidadesDto;

    it('debe bloquear la comunidad, crear las unidades después del último orden y registrarlo', async () => {
      mockUnidadesRepository.find.mockResolvedValue([
        crearUnidad({ idUnidad: 100, numeroIdentificador: '16' }),
      ]);

      const resultado = await target.crearLote(red, 9, lote);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(Unidad, [
        expect.objectContaining({
          idRed: 3,
          numeroIdentificador: '16',
          callePasaje: 'Pasaje 2',
          orden: 16,
        }),
        expect.objectContaining({ numeroIdentificador: '17', orden: 17 }),
        expect.objectContaining({ numeroIdentificador: '18', orden: 18 }),
      ]);
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 9,
          accion: 'crear_unidades',
          entidad: 'unidades',
          detalle: {
            cantidad: 3,
            desde: '16',
            hasta: '18',
            grupo: 'Pasaje 2',
            omitidas: 0,
          },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
      expect(mockUnidadesRepository.find).toHaveBeenCalledWith({
        where: { idUnidad: In([100, 101, 102]), idRed: 3 },
        order: { orden: 'ASC' },
      });
      expect(resultado.omitidas).toEqual([]);
      expect(resultado.creadas).toHaveLength(1);
    });

    it('debe omitir los números que ya existen, incluidos los eliminados', async () => {
      mockManager.find.mockResolvedValue([
        { torre: null, numeroIdentificador: '17' },
      ]);

      const resultado = await target.crearLote(red, 9, lote);

      expect(mockManager.find).toHaveBeenCalledWith(Unidad, {
        select: { torre: true, numeroIdentificador: true },
        where: { idRed: 3, numeroIdentificador: In(['16', '17', '18']) },
        withDeleted: true,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(Unidad, [
        expect.objectContaining({ numeroIdentificador: '16' }),
        expect.objectContaining({ numeroIdentificador: '18' }),
      ]);
      expect(resultado.omitidas).toEqual(['17']);
    });

    it('en un edificio debe omitir solo los números repetidos de la misma torre', async () => {
      comunidad = { idRed: 3, tipo: TipoRedVecinal.EDIFICIO } as RedVecinal;
      mockManager.find.mockResolvedValue([
        { torre: 'A', numeroIdentificador: '101' },
        { torre: 'B', numeroIdentificador: '102' },
      ]);

      const resultado = await target.crearLote(red, 9, {
        torre: 'B',
        pisoDesde: 1,
        pisoHasta: 1,
        porPiso: 2,
      } as CrearLoteUnidadesDto);

      expect(mockManager.insert).toHaveBeenCalledWith(Unidad, [
        expect.objectContaining({
          numeroIdentificador: '101',
          torre: 'B',
          tipo: TipoUnidad.DEPARTAMENTO,
        }),
      ]);
      expect(resultado.omitidas).toEqual(['102']);
    });

    it('no debe insertar ni registrar nada cuando todas ya existen', async () => {
      mockManager.find.mockResolvedValue(
        ['16', '17', '18'].map((numero) => ({
          torre: null,
          numeroIdentificador: numero,
        })),
      );

      const resultado = await target.crearLote(red, 9, lote);

      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
      expect(resultado).toEqual({
        creadas: [],
        omitidas: ['16', '17', '18'],
      });
    });

    it('debe pasar a mayúsculas la manzana de una villa', async () => {
      comunidad = { idRed: 3, tipo: TipoRedVecinal.VILLA } as RedVecinal;

      await target.crearLote(red, 9, {
        grupo: 'd',
        desde: 1,
        hasta: 1,
      } as CrearLoteUnidadesDto);

      expect(mockManager.insert).toHaveBeenCalledWith(Unidad, [
        expect.objectContaining({ callePasaje: 'Manzana D', manzana: 'D' }),
      ]);
    });

    it('debe empezar el orden en 1 cuando la comunidad no tiene unidades', async () => {
      mockConsulta.getRawOne.mockResolvedValue({ maximo: null });

      await target.crearLote(red, 9, lote);

      expect(mockManager.insert).toHaveBeenCalledWith(Unidad, [
        expect.objectContaining({ orden: 1 }),
        expect.objectContaining({ orden: 2 }),
        expect.objectContaining({ orden: 3 }),
      ]);
    });

    it('debe rechazar un lote que no corresponde al tipo de la comunidad', async () => {
      comunidad = { idRed: 3, tipo: TipoRedVecinal.EDIFICIO } as RedVecinal;

      await expect(target.crearLote(red, 9, lote)).rejects.toThrow(
        new BadRequestException(
          'grupo no corresponde a una comunidad de tipo Edificio',
        ),
      );

      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('editar', () => {
    it('debe corregir el número, validar que no se repita y registrarlo', async () => {
      await target.editar(red, 9, 10, { numeroIdentificador: '6' });

      expect(mockManager.findOne).toHaveBeenCalledWith(Unidad, {
        where: { idUnidad: 10, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.exists).toHaveBeenCalledWith(Unidad, {
        where: { idRed: 3, torre: IsNull(), numeroIdentificador: '6' },
        withDeleted: true,
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Unidad,
        { idUnidad: 10, idRed: 3 },
        { numeroIdentificador: '6' },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'editar_unidad',
          idEntidad: 10,
          detalle: { anterior: '5', nuevo: '6' },
        }),
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe buscar la repetición dentro de la torre del departamento', async () => {
      unidadEnBd = crearUnidad({
        tipo: TipoUnidad.DEPARTAMENTO,
        torre: 'B',
        numeroIdentificador: '101',
      });
      mockManager.exists.mockResolvedValue(true);

      await expect(
        target.editar(red, 9, 10, { numeroIdentificador: '102' }),
      ).rejects.toThrow(
        new ConflictException('Ya existe el departamento 102 en la Torre B'),
      );

      expect(mockManager.exists).toHaveBeenCalledWith(Unidad, {
        where: { idRed: 3, torre: 'B', numeroIdentificador: '102' },
        withDeleted: true,
      });
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe rechazar una casa con un número que ya existe', async () => {
      mockManager.exists.mockResolvedValue(true);

      await expect(
        target.editar(red, 9, 10, { numeroIdentificador: '6' }),
      ).rejects.toThrow(
        new ConflictException('Ya existe la unidad 6 en esta comunidad'),
      );
    });

    it('no debe escribir ni registrar nada cuando el número es el mismo', async () => {
      await target.editar(red, 9, 10, { numeroIdentificador: '5' });

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException cuando la unidad es de otra comunidad', async () => {
      unidadEnBd = null;

      await expect(
        target.editar(red, 9, 99, { numeroIdentificador: '6' }),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
    });
  });
});

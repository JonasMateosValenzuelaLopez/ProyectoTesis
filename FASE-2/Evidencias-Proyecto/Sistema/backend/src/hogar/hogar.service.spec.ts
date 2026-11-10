import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, IsNull } from 'typeorm';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { GuardarFichaDto } from './dto/guardar-ficha.dto';
import { HogarFicha, TipoFicha } from './entities/hogar-ficha.entity';
import { HogarService } from './hogar.service';

const AHORA = new Date('2026-11-04T15:00:00Z');
const CREADA = new Date('2026-03-01T13:00:00Z');

describe('HogarService', () => {
  let target: HogarService;
  let mockFichasRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockManager: { findOne: jest.Mock; count: jest.Mock; insert: jest.Mock };
  let mockDataSource: { transaction: jest.Mock };

  const red: ContextoRed = {
    idRed: 3,
    roles: [],
    modulos: [],
    idsUnidades: [12, 15],
  };

  const crearFicha = (cambios: Partial<HogarFicha> = {}): HogarFicha =>
    ({
      idFicha: 1,
      idUnidad: 12,
      tipo: TipoFicha.MANTENCION,
      titulo: 'Calefont',
      detalle: 'Logia',
      contactoNombre: 'Hugo Pinto',
      contactoTelefono: '+56955551212',
      fecha: '2025-11-04',
      fechaVence: '2026-11-04',
      creadoPor: 7,
      creador: { idUsuario: 7, nombre: 'Ana' } as Usuario,
      fechaCreacion: CREADA,
      fechaActualizacion: CREADA,
      fechaEliminacion: null,
      ...cambios,
    }) as HogarFicha;

  const fichaSerializada = {
    idFicha: 1,
    idUnidad: 12,
    tipo: TipoFicha.MANTENCION,
    titulo: 'Calefont',
    detalle: 'Logia',
    contactoNombre: 'Hugo Pinto',
    contactoTelefono: '+56955551212',
    fecha: '2025-11-04',
    fechaVence: '2026-11-04',
    creadoPor: { idUsuario: 7, nombre: 'Ana' },
    fechaCreacion: CREADA,
    fechaActualizacion: CREADA,
  };

  const dtoPintura = {
    tipo: TipoFicha.PINTURA,
    titulo: 'Living',
    detalle: 'SW 7036',
  } as GuardarFichaDto;

  const camposPintura = {
    tipo: TipoFicha.PINTURA,
    titulo: 'Living',
    detalle: 'SW 7036',
    contactoNombre: null,
    contactoTelefono: null,
    fecha: null,
    fechaVence: null,
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    mockFichasRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(crearFicha()),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockManager = {
      findOne: jest.fn().mockResolvedValue({ idUnidad: 12 }),
      count: jest.fn().mockResolvedValue(0),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idFicha: 1 }] }),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        HogarService,
        {
          provide: getRepositoryToken(HogarFicha),
          useValue: mockFichasRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    target = module.get(HogarService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe devolver las fichas de la unidad propia con el nombre de quien las creó', async () => {
      mockFichasRepository.find.mockResolvedValue([crearFicha()]);

      const resultado = await target.listar(12, red);

      expect(resultado).toEqual([fichaSerializada]);
      expect(mockFichasRepository.find).toHaveBeenCalledWith({
        where: { idUnidad: 12 },
        relations: { creador: true },
        order: { idFicha: 'ASC' },
      });
    });

    it('debe devolver creadoPor en null cuando esa cuenta fue eliminada', async () => {
      mockFichasRepository.find.mockResolvedValue([
        crearFicha({ creador: null }),
      ]);

      const [ficha] = await target.listar(12, red);

      expect(ficha.creadoPor).toBeNull();
    });

    it('debe lanzar NotFoundException sin consultar cuando la unidad no es propia', async () => {
      await expect(target.listar(99, red)).rejects.toThrow(
        new NotFoundException('Unidad no encontrada'),
      );

      expect(mockFichasRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('crear', () => {
    it('debe insertar con la unidad de la ruta y el usuario del token, bloqueando la unidad', async () => {
      const resultado = await target.crear(12, red, 7, dtoPintura);

      expect(mockManager.findOne).toHaveBeenCalledWith(Unidad, {
        where: { idUnidad: 12 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.count).toHaveBeenCalledWith(HogarFicha, {
        where: { idUnidad: 12 },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(HogarFicha, {
        ...camposPintura,
        idUnidad: 12,
        creadoPor: 7,
      });
      expect(resultado).toEqual(fichaSerializada);
    });

    it('debe lanzar ConflictException cuando la unidad ya tiene 300 fichas', async () => {
      mockManager.count.mockResolvedValue(300);

      await expect(target.crear(12, red, 7, dtoPintura)).rejects.toThrow(
        new ConflictException('La unidad ya tiene el máximo de 300 fichas'),
      );

      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException sin abrir transacción cuando la unidad no es propia', async () => {
      await expect(target.crear(99, red, 7, dtoPintura)).rejects.toThrow(
        new NotFoundException('Unidad no encontrada'),
      );

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('actualizar', () => {
    it('debe reemplazar los campos editables y dejar en null los que no llegan', async () => {
      await target.actualizar(1, red, dtoPintura);

      expect(mockFichasRepository.findOne).toHaveBeenCalledWith({
        where: { idFicha: 1, idUnidad: In([12, 15]) },
        relations: { creador: true },
      });
      expect(mockFichasRepository.update).toHaveBeenCalledWith(
        { idFicha: 1, fechaEliminacion: IsNull() },
        camposPintura,
      );
    });

    it('debe lanzar NotFoundException cuando la ficha es de otra unidad o fue eliminada', async () => {
      mockFichasRepository.findOne.mockResolvedValue(null);

      await expect(target.actualizar(1, red, dtoPintura)).rejects.toThrow(
        new NotFoundException('Ficha no encontrada'),
      );

      expect(mockFichasRepository.update).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException sin consultar cuando no vive en esta comunidad', async () => {
      await expect(
        target.actualizar(1, { ...red, idsUnidades: [] }, dtoPintura),
      ).rejects.toThrow(new NotFoundException('Ficha no encontrada'));

      expect(mockFichasRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('registrarMantencion', () => {
    it.each([
      ['anual', '2025-11-04', '2026-11-04', '2027-11-04'],
      ['semestral', '2026-01-10', '2026-07-10', '2027-05-04'],
      ['de menos de un mes', '2026-10-20', '2026-10-30', '2026-12-04'],
      ['sin fecha anterior', null, '2026-12-01', '2027-11-04'],
    ])(
      'debe fijar hoy y correr el intervalo %s',
      async (_caso, fecha, fechaVence, esperado) => {
        mockFichasRepository.findOne.mockResolvedValue(
          crearFicha({ fecha, fechaVence }),
        );

        await target.registrarMantencion(1, red);

        expect(mockFichasRepository.update).toHaveBeenCalledWith(
          {
            idFicha: 1,
            tipo: TipoFicha.MANTENCION,
            fechaEliminacion: IsNull(),
          },
          { fecha: '2026-11-04', fechaVence: esperado },
        );
      },
    );

    it('debe usar el día de Chile aunque en UTC ya sea mañana', async () => {
      jest.setSystemTime(new Date('2026-11-05T01:30:00Z'));

      await target.registrarMantencion(1, red);

      expect(mockFichasRepository.update).toHaveBeenCalledWith(
        expect.anything(),
        { fecha: '2026-11-04', fechaVence: '2027-11-04' },
      );
    });

    it('debe lanzar BadRequestException cuando la ficha no es de mantención', async () => {
      mockFichasRepository.findOne.mockResolvedValue(
        crearFicha({ tipo: TipoFicha.GARANTIA }),
      );

      await expect(target.registrarMantencion(1, red)).rejects.toThrow(
        new BadRequestException(
          'Solo las fichas de tipo Mantención registran mantenciones',
        ),
      );

      expect(mockFichasRepository.update).not.toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException cuando la ficha no es propia', async () => {
      mockFichasRepository.findOne.mockResolvedValue(null);

      await expect(target.registrarMantencion(1, red)).rejects.toThrow(
        new NotFoundException('Ficha no encontrada'),
      );
    });
  });

  describe('eliminar', () => {
    it('debe hacer borrado lógico de la ficha propia', async () => {
      await target.eliminar(1, red);

      expect(mockFichasRepository.softDelete).toHaveBeenCalledWith({
        idFicha: 1,
      });
    });

    it('debe lanzar NotFoundException sin borrar cuando la ficha no es propia', async () => {
      mockFichasRepository.findOne.mockResolvedValue(null);

      await expect(target.eliminar(1, red)).rejects.toThrow(
        new NotFoundException('Ficha no encontrada'),
      );

      expect(mockFichasRepository.softDelete).not.toHaveBeenCalled();
    });
  });
});

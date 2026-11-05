import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { EstadoExencion, Exencion } from './entities/exencion.entity';
import { ExencionesService } from './exenciones.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('ExencionesService', () => {
  let target: ExencionesService;
  let mockManager: {
    findOne: jest.Mock;
    find: jest.Mock;
    exists: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let fila: CobroUnidad | null;
  let exencionEnBd: Exencion | null;
  let enCurso: boolean;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.RESIDENTE],
    modulos: [],
    idsUnidades: [10],
  };

  const exencion = (estado: EstadoExencion) =>
    ({ idExencion: 4, idCobroUnidad: 1, estado }) as Exencion;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    fila = {
      idCobroUnidad: 1,
      idUnidad: 10,
      estado: EstadoCobroUnidad.PENDIENTE,
      cobro: { concepto: 'Gasto común' },
    } as CobroUnidad;
    exencionEnBd = exencion(EstadoExencion.PENDIENTE);
    enCurso = false;
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === Exencion ? exencionEnBd : fila),
      ),
      find: jest.fn().mockResolvedValue([]),
      exists: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === Exencion ? enCurso : true),
      ),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idExencion: 4 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ExencionesService,
        {
          provide: getRepositoryToken(Exencion),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(() => Promise.resolve(exencionEnBd)),
          },
        },
        {
          provide: DataSource,
          useValue: {
            manager: mockManager,
            transaction: (trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
          },
        },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(ExencionesService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('solicitar', () => {
    const dto = { idCobroUnidad: 1, motivo: 'Quedé cesante' };

    it('el residente debe crearla Pendiente, para que la revise Tesorería', async () => {
      await target.solicitarComoResidente(red, 9, dto);

      expect(mockManager.insert).toHaveBeenCalledWith(Exencion, {
        idCobroUnidad: 1,
        motivo: 'Quedé cesante',
        solicitadaPor: 9,
        estado: EstadoExencion.PENDIENTE,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'solicitar_exencion',
          detalle: expect.objectContaining({ desdeTesoreria: false }),
        }),
        mockManager,
      );
    });

    it('el Tesorero debe crearla Por aprobar, ya revisada por él', async () => {
      await target.solicitarComoTesoreria({ ...red, idsUnidades: [] }, 5, dto);

      expect(mockManager.insert).toHaveBeenCalledWith(Exencion, {
        idCobroUnidad: 1,
        motivo: 'Quedé cesante',
        solicitadaPor: 5,
        estado: EstadoExencion.POR_APROBAR,
        revisadaPor: 5,
        revisadaEn: AHORA,
      });
    });

    it('el residente no debe pedirla por un cobro de otra unidad', async () => {
      await expect(
        target.solicitarComoResidente({ ...red, idsUnidades: [20] }, 9, dto),
      ).rejects.toThrow(new NotFoundException('Cobro no encontrado'));
    });

    it('debe rechazar un cobro que ya no está pendiente', async () => {
      fila = { ...fila, estado: EstadoCobroUnidad.PAGADO } as CobroUnidad;

      await expect(target.solicitarComoResidente(red, 9, dto)).rejects.toThrow(
        new ConflictException(
          'Solo se puede pedir exención de un cobro pendiente',
        ),
      );
    });

    it('debe rechazar una segunda exención en curso para el mismo cobro', async () => {
      enCurso = true;

      await expect(target.solicitarComoResidente(red, 9, dto)).rejects.toThrow(
        new ConflictException('Este cobro ya tiene una exención en revisión'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('revisar (Tesorería)', () => {
    it('al aceptar debe pasarla a la Presidencia', async () => {
      await target.revisar(red, 5, 4, { aprobado: true });

      expect(mockManager.update).toHaveBeenCalledWith(
        Exencion,
        { idExencion: 4 },
        {
          estado: EstadoExencion.POR_APROBAR,
          revisadaPor: 5,
          revisadaEn: AHORA,
        },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'aceptar_exencion' }),
        mockManager,
      );
    });

    it('al rechazar debe terminarla ahí, con su comentario', async () => {
      await target.revisar(red, 5, 4, {
        aprobado: false,
        comentario: 'Sin respaldo',
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        Exencion,
        { idExencion: 4 },
        {
          estado: EstadoExencion.RECHAZADA,
          revisadaPor: 5,
          revisadaEn: AHORA,
          resueltaPor: 5,
          resueltaEn: AHORA,
          comentarioResolucion: 'Sin respaldo',
        },
      );
    });

    it('debe rechazar revisar una exención que ya pasó por Tesorería', async () => {
      exencionEnBd = exencion(EstadoExencion.POR_APROBAR);

      await expect(
        target.revisar(red, 5, 4, { aprobado: true }),
      ).rejects.toThrow(
        new ConflictException(
          'Esta exención no está esperando la revisión de Tesorería',
        ),
      );
    });
  });

  describe('resolver (Presidencia)', () => {
    beforeEach(() => {
      exencionEnBd = exencion(EstadoExencion.POR_APROBAR);
    });

    it('al aprobar debe dejar el cobro de la unidad Exento', async () => {
      await target.resolver(red, 9, 4, { aprobado: true, comentario: 'Ok' });

      expect(mockManager.update).toHaveBeenCalledWith(
        CobroUnidad,
        { idCobroUnidad: 1 },
        { estado: EstadoCobroUnidad.EXENTO },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        Exencion,
        { idExencion: 4 },
        {
          estado: EstadoExencion.APROBADA,
          resueltaPor: 9,
          resueltaEn: AHORA,
          comentarioResolucion: 'Ok',
        },
      );
    });

    it('al rechazar no debe tocar el cobro', async () => {
      await target.resolver(red, 9, 4, { aprobado: false });

      expect(mockManager.update).not.toHaveBeenCalledWith(
        CobroUnidad,
        expect.anything(),
        expect.anything(),
      );
    });

    it('no debe eximir un cobro que ya se pagó', async () => {
      fila = { ...fila, estado: EstadoCobroUnidad.PAGADO } as CobroUnidad;

      await expect(
        target.resolver(red, 9, 4, { aprobado: true }),
      ).rejects.toThrow(
        new ConflictException(
          'El cobro ya no está pendiente: no se puede eximir',
        ),
      );
    });

    it('no debe resolver una exención que Tesorería no ha revisado', async () => {
      exencionEnBd = exencion(EstadoExencion.PENDIENTE);

      await expect(
        target.resolver(red, 9, 4, { aprobado: true }),
      ).rejects.toThrow(
        new ConflictException(
          'Esta exención no está esperando la decisión de la Presidencia',
        ),
      );
    });

    it('debe responder 404 por una exención de otra comunidad', async () => {
      mockManager.exists.mockResolvedValue(false);

      await expect(
        target.resolver(red, 9, 4, { aprobado: true }),
      ).rejects.toThrow(new NotFoundException('Exención no encontrada'));
    });
  });
});

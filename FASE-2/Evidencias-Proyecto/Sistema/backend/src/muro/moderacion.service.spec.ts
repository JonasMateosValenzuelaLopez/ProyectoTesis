import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  EstadoModeracion,
  MuroPublicacion,
  TipoPublicacion,
} from './entities/muro-publicacion.entity';
import {
  EstadoReporte,
  LugarPublicacion,
  MuroReporte,
} from './entities/muro-reporte.entity';
import { ModeracionService } from './moderacion.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('ModeracionService', () => {
  let target: ModeracionService;
  let mockManager: { findOne: jest.Mock; update: jest.Mock };
  let mockBitacora: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let enBd: MuroPublicacion | null;
  let reportesActualizados: number;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.ADMINISTRADOR],
    modulos: [],
    idsUnidades: [],
  };

  const publicacion = (estadoModeracion = EstadoModeracion.PUBLICADA) =>
    ({
      idPublicacion: 40,
      idRed: 3,
      idUsuario: 8,
      tipo: TipoPublicacion.VECINO,
      contenido: '¿Alguien perdió un gato?',
      estadoModeracion,
      aprobadoPor: null,
      moderadoPor: null,
      unidad: null,
    }) as unknown as MuroPublicacion;

  const pendientes = {
    tipoPublicacion: LugarPublicacion.MURO,
    idPublicacion: 40,
    estado: EstadoReporte.PENDIENTE,
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    enBd = publicacion();
    reportesActualizados = 2;
    mockManager = {
      findOne: jest.fn(() => Promise.resolve(enBd)),
      update: jest.fn((entidad: unknown) =>
        Promise.resolve({
          affected: entidad === MuroReporte ? reportesActualizados : 1,
        }),
      ),
    };
    mockBitacora = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ModeracionService,
        {
          provide: getRepositoryToken(MuroPublicacion),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOneOrFail: jest.fn(() => Promise.resolve(publicacion())),
          },
        },
        {
          provide: DataSource,
          useValue: {
            manager: { find: jest.fn().mockResolvedValue([]) },
            transaction: (trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
          },
        },
        { provide: BitacoraService, useValue: mockBitacora },
      ],
    }).compile();

    target = module.get(ModeracionService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('ocultar debe marcar quién y cuándo, y atender los reportes pendientes', async () => {
    await target.ocultar(red, 2, 40);

    expect(mockManager.findOne).toHaveBeenCalledWith(MuroPublicacion, {
      where: { idPublicacion: 40, idRed: 3, tipo: TipoPublicacion.VECINO },
      lock: { mode: 'pessimistic_write' },
    });
    expect(mockManager.update).toHaveBeenCalledWith(
      MuroPublicacion,
      { idPublicacion: 40 },
      {
        estadoModeracion: EstadoModeracion.OCULTA,
        moderadoPor: 2,
        moderadoEn: AHORA,
      },
    );
    expect(mockManager.update).toHaveBeenCalledWith(MuroReporte, pendientes, {
      estado: EstadoReporte.ATENDIDO,
      resueltoPor: 2,
      resueltoEn: AHORA,
    });
    expect(mockBitacora.registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'ocultar_publicacion',
        detalle: expect.objectContaining({ autor: 8, reportesResueltos: 2 }),
      }),
      mockManager,
    );
  });

  it('no debe ocultar dos veces', async () => {
    enBd = publicacion(EstadoModeracion.OCULTA);

    await expect(target.ocultar(red, 2, 40)).rejects.toThrow(
      new ConflictException('La publicación ya está oculta'),
    );
  });

  it('restaurar debe volver a publicarla sin tocar los reportes', async () => {
    enBd = publicacion(EstadoModeracion.OCULTA);

    await target.restaurar(red, 2, 40);

    expect(mockManager.update).toHaveBeenCalledWith(
      MuroPublicacion,
      { idPublicacion: 40 },
      {
        estadoModeracion: EstadoModeracion.PUBLICADA,
        moderadoPor: 2,
        moderadoEn: AHORA,
      },
    );
    expect(mockManager.update).toHaveBeenCalledTimes(1);
  });

  it('no debe restaurar una publicación visible', async () => {
    await expect(target.restaurar(red, 2, 40)).rejects.toThrow(
      new ConflictException('La publicación no está oculta'),
    );
  });

  it('descartar debe cerrar los reportes y dejar la publicación visible', async () => {
    await target.descartarReportes(red, 2, 40);

    expect(mockManager.update).toHaveBeenCalledWith(MuroReporte, pendientes, {
      estado: EstadoReporte.DESCARTADO,
      resueltoPor: 2,
      resueltoEn: AHORA,
    });
    expect(mockManager.update).not.toHaveBeenCalledWith(
      MuroPublicacion,
      expect.anything(),
      expect.anything(),
    );
  });

  it('descartar sin reportes pendientes debe responder 409', async () => {
    reportesActualizados = 0;

    await expect(target.descartarReportes(red, 2, 40)).rejects.toThrow(
      new ConflictException('La publicación no tiene reportes pendientes'),
    );
    expect(mockBitacora.registrar).not.toHaveBeenCalled();
  });

  it('debe responder 404 por una publicación eliminada, oficial o de otra comunidad', async () => {
    enBd = null;

    await expect(target.ocultar(red, 2, 40)).rejects.toThrow(
      new NotFoundException('Publicación no encontrada'),
    );
  });
});

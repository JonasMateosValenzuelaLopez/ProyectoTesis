import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, LessThan } from 'typeorm';
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
import { Residencia } from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ModeracionService } from './moderacion.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('ModeracionService', () => {
  let target: ModeracionService;
  let mockManager: { findOne: jest.Mock; update: jest.Mock };
  let mockBitacora: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockPublicacionesRepository: {
    find: jest.Mock;
    findOneOrFail: jest.Mock;
  };
  let mockManagerLectura: { find: jest.Mock };
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
    mockPublicacionesRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOneOrFail: jest.fn(() => Promise.resolve(publicacion())),
    };
    mockManagerLectura = { find: jest.fn().mockResolvedValue([]) };

    const module = await Test.createTestingModule({
      providers: [
        ModeracionService,
        {
          provide: getRepositoryToken(MuroPublicacion),
          useValue: mockPublicacionesRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: mockManagerLectura,
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

  it('listar debe traer las publicaciones de vecinos con sus reportes pendientes del muro y la vivienda de quien reporta', async () => {
    mockPublicacionesRepository.find.mockResolvedValue([publicacion()]);
    mockManagerLectura.find.mockImplementation((entidad: unknown) => {
      if (entidad === MuroReporte) {
        return Promise.resolve([
          {
            idReporte: 5,
            idPublicacion: 40,
            idUsuario: 9,
            motivo: 'Contenido ofensivo',
            fechaCreacion: AHORA,
          },
        ]);
      }
      if (entidad === Residencia) {
        return Promise.resolve([
          { idUsuario: 9, unidad: { numeroIdentificador: '7' } },
        ]);
      }
      if (entidad === Usuario) {
        return Promise.resolve([
          { idUsuario: 8, nombre: 'Luis', primerApellido: 'Soto' },
          { idUsuario: 9, nombre: 'Ana', primerApellido: 'Rojas' },
        ]);
      }
      return Promise.resolve([]);
    });

    const resultado = await target.listar(red, { antesDe: 50, limite: 10 });

    expect(mockPublicacionesRepository.find).toHaveBeenCalledWith({
      where: {
        idRed: 3,
        tipo: TipoPublicacion.VECINO,
        idPublicacion: LessThan(50),
      },
      relations: { unidad: true },
      order: { idPublicacion: 'DESC' },
      take: 11,
    });
    expect(mockManagerLectura.find).toHaveBeenCalledWith(MuroReporte, {
      where: {
        tipoPublicacion: LugarPublicacion.MURO,
        idPublicacion: In([40]),
        estado: EstadoReporte.PENDIENTE,
      },
      order: { idReporte: 'ASC' },
    });
    expect(resultado.siguiente).toBeNull();
    expect(resultado.publicaciones[0].reportes).toEqual([
      {
        idReporte: 5,
        motivo: 'Contenido ofensivo',
        fecha: AHORA,
        reportadoPor: { idUsuario: 9, nombre: 'Ana Rojas', cargo: null },
        vivienda: '7',
      },
    ]);
    expect(resultado.publicaciones[0].autor).toEqual({
      idUsuario: 8,
      nombre: 'Luis Soto',
      cargo: null,
    });
  });

  it('listar debe entregar el cursor siguiente cuando hay más publicaciones', async () => {
    mockPublicacionesRepository.find.mockResolvedValue([
      { ...publicacion(), idPublicacion: 41 },
      publicacion(),
    ]);

    const resultado = await target.listar(red, { limite: 1 });

    expect(resultado.publicaciones).toHaveLength(1);
    expect(resultado.siguiente).toBe(41);
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

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, LessThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  EstadoAprobacion,
  EstadoModeracion,
  MuroPublicacion,
  TIPOS_OFICIALES,
  TipoPublicacion,
} from './entities/muro-publicacion.entity';
import { LugarPublicacion, MuroReporte } from './entities/muro-reporte.entity';
import { MuroService } from './muro.service';

describe('MuroService', () => {
  let target: MuroService;
  let mockPublicaciones: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    insert: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockReportes: { find: jest.Mock; exists: jest.Mock; insert: jest.Mock };
  let mockBitacora: { marcarActividad: jest.Mock };

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.RESIDENTE],
    modulos: [],
    idsUnidades: [12, 15],
  };

  const publicacion = (cambios: Partial<MuroPublicacion> = {}) =>
    ({
      idPublicacion: 40,
      idRed: 3,
      idUsuario: 8,
      idUnidad: 15,
      unidad: { idUnidad: 15, numeroIdentificador: '15' },
      tipo: TipoPublicacion.VECINO,
      titulo: null,
      contenido: '¿Alguien perdió un gato?',
      estadoAprobacion: EstadoAprobacion.NO_REQUIERE,
      aprobadoPor: null,
      aprobadoEn: null,
      estadoModeracion: EstadoModeracion.PUBLICADA,
      moderadoPor: null,
      moderadoEn: null,
      fechaCreacion: new Date('2026-11-05T12:00:00Z'),
      ...cambios,
    }) as MuroPublicacion;

  beforeEach(async () => {
    mockPublicaciones = {
      find: jest.fn().mockResolvedValue([publicacion()]),
      findOne: jest.fn().mockResolvedValue(publicacion()),
      findOneOrFail: jest
        .fn()
        .mockResolvedValue(publicacion({ idUsuario: 7, idUnidad: 12 })),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idPublicacion: 41 }] }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockReportes = {
      find: jest.fn().mockResolvedValue([{ idPublicacion: 40 }]),
      exists: jest.fn().mockResolvedValue(false),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idReporte: 6 }] }),
    };
    mockBitacora = { marcarActividad: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        MuroService,
        {
          provide: getRepositoryToken(MuroPublicacion),
          useValue: mockPublicaciones,
        },
        { provide: getRepositoryToken(MuroReporte), useValue: mockReportes },
        {
          provide: DataSource,
          useValue: { manager: { find: jest.fn().mockResolvedValue([]) } },
        },
        { provide: BitacoraService, useValue: mockBitacora },
      ],
    }).compile();

    target = module.get(MuroService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe pedir lo oficial aprobado, lo de vecinos publicado y lo propio aunque esté oculto', async () => {
      await target.listar(red, 7, { antesDe: 100, limite: 20 });

      const cursor = { idPublicacion: LessThan(100) };
      expect(mockPublicaciones.find).toHaveBeenCalledWith({
        where: [
          {
            idRed: 3,
            tipo: In(TIPOS_OFICIALES),
            estadoAprobacion: EstadoAprobacion.APROBADA,
            ...cursor,
          },
          {
            idRed: 3,
            tipo: TipoPublicacion.VECINO,
            estadoModeracion: EstadoModeracion.PUBLICADA,
            ...cursor,
          },
          { idRed: 3, tipo: TipoPublicacion.VECINO, idUsuario: 7, ...cursor },
        ],
        relations: { unidad: true },
        order: { idPublicacion: 'DESC' },
        take: 21,
      });
    });

    it('debe marcar lo propio y lo que ya reportó la persona', async () => {
      const { publicaciones, siguiente } = await target.listar(red, 7, {});

      expect(publicaciones[0]).toEqual(
        expect.objectContaining({
          idPublicacion: 40,
          esMia: false,
          reportadaPorMi: true,
          unidad: { idUnidad: 15, numeroIdentificador: '15' },
        }),
      );
      expect(siguiente).toBeNull();
      expect(mockReportes.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tipoPublicacion: LugarPublicacion.MURO,
            idPublicacion: In([40]),
            idUsuario: 7,
          },
        }),
      );
    });

    it('debe devolver el cursor cuando hay más publicaciones', async () => {
      mockPublicaciones.find.mockResolvedValue([
        publicacion({ idPublicacion: 9 }),
        publicacion({ idPublicacion: 8 }),
      ]);

      const { publicaciones, siguiente } = await target.listar(red, 7, {
        limite: 1,
      });

      expect(publicaciones).toHaveLength(1);
      expect(siguiente).toBe(9);
    });
  });

  describe('publicar', () => {
    it('debe publicar como Vecino con la primera unidad de la persona', async () => {
      await target.publicar(red, 7, { contenido: 'Vendo bicicleta' });

      expect(mockPublicaciones.insert).toHaveBeenCalledWith({
        idRed: 3,
        idUsuario: 7,
        idUnidad: 12,
        tipo: TipoPublicacion.VECINO,
        titulo: null,
        contenido: 'Vendo bicicleta',
        estadoAprobacion: EstadoAprobacion.NO_REQUIERE,
      });
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe rechazar a quien no vive en la comunidad', async () => {
      await expect(
        target.publicar({ ...red, idsUnidades: [] }, 7, {
          contenido: 'Hola vecinos',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe rechazar una unidad que no es suya', async () => {
      await expect(
        target.publicar(red, 7, { contenido: 'Hola vecinos', idUnidad: 99 }),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
    });
  });

  describe('eliminarPropia', () => {
    it('debe hacer borrado lógico solo si la publicación es de vecino y de quien la pide', async () => {
      await target.eliminarPropia(red, 7, 40);

      expect(mockPublicaciones.softDelete).toHaveBeenCalledWith({
        idPublicacion: 40,
        idRed: 3,
        idUsuario: 7,
        tipo: TipoPublicacion.VECINO,
      });
    });

    it('debe responder 404 por una publicación ajena u oficial', async () => {
      mockPublicaciones.softDelete.mockResolvedValue({ affected: 0 });

      await expect(target.eliminarPropia(red, 7, 40)).rejects.toThrow(
        new NotFoundException('Publicación no encontrada'),
      );
    });
  });

  describe('reportar', () => {
    it('debe guardar el reporte con la comunidad del contexto', async () => {
      const resultado = await target.reportar(red, 7, 40, {
        motivo: 'Ofensivo',
      });

      expect(mockReportes.insert).toHaveBeenCalledWith({
        idRed: 3,
        tipoPublicacion: LugarPublicacion.MURO,
        idPublicacion: 40,
        idUsuario: 7,
        motivo: 'Ofensivo',
      });
      expect(resultado).toEqual({ idReporte: 6 });
    });

    it('solo debe aceptar publicaciones de vecinos visibles de la comunidad', async () => {
      mockPublicaciones.findOne.mockResolvedValue(null);

      await expect(
        target.reportar(red, 7, 40, { motivo: 'Ofensivo' }),
      ).rejects.toThrow(new NotFoundException('Publicación no encontrada'));
      expect(mockPublicaciones.findOne).toHaveBeenCalledWith({
        where: {
          idPublicacion: 40,
          idRed: 3,
          tipo: TipoPublicacion.VECINO,
          estadoModeracion: EstadoModeracion.PUBLICADA,
        },
      });
    });

    it('no debe dejar reportar la propia', async () => {
      await expect(
        target.reportar(red, 8, 40, { motivo: 'Ofensivo' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('no debe dejar reportar dos veces', async () => {
      mockReportes.exists.mockResolvedValue(true);

      await expect(
        target.reportar(red, 7, 40, { motivo: 'Ofensivo' }),
      ).rejects.toThrow(
        new ConflictException('Ya reportaste esta publicación'),
      );
    });
  });
});

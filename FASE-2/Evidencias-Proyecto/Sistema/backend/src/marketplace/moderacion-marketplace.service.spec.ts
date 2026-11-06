import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, LessThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { EstadoModeracion } from '../muro/entities/muro-publicacion.entity';
import {
  EstadoReporte,
  LugarPublicacion,
  MuroReporte,
} from '../muro/entities/muro-reporte.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  MarketplacePublicacion,
  TipoAviso,
} from './entities/marketplace-publicacion.entity';
import { ModeracionMarketplaceService } from './moderacion-marketplace.service';

const AHORA = new Date('2026-11-06T13:00:00Z');
const ID_ADMIN = 2;

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.ADMINISTRADOR],
  modulos: [],
  idsUnidades: [],
};

const crearAviso = (cambios: Partial<MarketplacePublicacion> = {}) =>
  ({
    idProducto: 40,
    idRed: 3,
    idUsuario: 15,
    unidad: null,
    tipo: TipoAviso.VENDO,
    titulo: 'Bicicleta aro 26',
    descripcion: null,
    precio: 45000,
    fechaPublicacion: AHORA,
    fechaCreacion: AHORA,
    estadoModeracion: EstadoModeracion.PUBLICADA,
    moderadoPor: null,
    moderadoEn: null,
    ...cambios,
  }) as MarketplacePublicacion;

const pendientes = {
  tipoPublicacion: LugarPublicacion.MARKETPLACE,
  idPublicacion: 40,
  estado: EstadoReporte.PENDIENTE,
};

describe('ModeracionMarketplaceService', () => {
  let target: ModeracionMarketplaceService;
  let mockAvisosRepository: { find: jest.Mock; findOneOrFail: jest.Mock };
  let mockManager: { findOne: jest.Mock; update: jest.Mock };
  let mockManagerLectura: { find: jest.Mock };
  let mockBitacora: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let avisoEnBd: MarketplacePublicacion | null;
  let reportesActualizados: number;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    avisoEnBd = crearAviso();
    reportesActualizados = 2;
    mockAvisosRepository = {
      find: jest.fn().mockResolvedValue([crearAviso()]),
      findOneOrFail: jest.fn(() => Promise.resolve(crearAviso())),
    };
    mockManager = {
      findOne: jest.fn(() => Promise.resolve(avisoEnBd)),
      update: jest.fn((entidad: unknown) =>
        Promise.resolve({
          affected: entidad === MuroReporte ? reportesActualizados : 1,
        }),
      ),
    };
    mockManagerLectura = {
      find: jest.fn((entidad: unknown) => {
        if (entidad === MuroReporte) {
          return Promise.resolve([
            {
              idReporte: 5,
              idPublicacion: 40,
              idUsuario: 9,
              motivo: 'Es una estafa',
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
            { idUsuario: 15, nombre: 'Luis', primerApellido: 'Soto' },
            { idUsuario: 9, nombre: 'Ana', primerApellido: 'Rojas' },
          ]);
        }
        return Promise.resolve([]);
      }),
    };
    mockBitacora = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ModeracionMarketplaceService,
        {
          provide: getRepositoryToken(MarketplacePublicacion),
          useValue: mockAvisosRepository,
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

    target = module.get(ModeracionMarketplaceService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe traer los avisos de la comunidad con sus reportes pendientes y la vivienda de quien reporta', async () => {
      const resultado = await target.listar(RED, { antesDe: 50, limite: 10 });

      expect(mockAvisosRepository.find).toHaveBeenCalledWith({
        where: { idRed: 3, idProducto: LessThan(50) },
        relations: { unidad: true },
        order: { idProducto: 'DESC' },
        take: 11,
      });
      expect(mockManagerLectura.find).toHaveBeenCalledWith(MuroReporte, {
        where: {
          tipoPublicacion: LugarPublicacion.MARKETPLACE,
          idPublicacion: In([40]),
          estado: EstadoReporte.PENDIENTE,
        },
        order: { idReporte: 'ASC' },
      });
      expect(resultado.siguiente).toBeNull();
      expect(resultado.avisos[0].reportes).toEqual([
        {
          idReporte: 5,
          motivo: 'Es una estafa',
          fecha: AHORA,
          reportadoPor: { idUsuario: 9, nombre: 'Ana Rojas' },
          vivienda: '7',
        },
      ]);
      expect(resultado.avisos[0].autor).toEqual({
        idUsuario: 15,
        nombre: 'Luis Soto',
      });
      expect(resultado.avisos[0].moderadoPor).toBeNull();
    });
  });

  describe('ocultar', () => {
    it('debe ocultar, atender los reportes y registrar en la bitácora con el manager', async () => {
      await target.ocultar(RED, ID_ADMIN, 40);

      expect(mockManager.findOne).toHaveBeenCalledWith(MarketplacePublicacion, {
        where: { idProducto: 40, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        {
          estadoModeracion: EstadoModeracion.OCULTA,
          moderadoPor: ID_ADMIN,
          moderadoEn: AHORA,
        },
      );
      expect(mockManager.update).toHaveBeenCalledWith(MuroReporte, pendientes, {
        estado: EstadoReporte.ATENDIDO,
        resueltoPor: ID_ADMIN,
        resueltoEn: AHORA,
      });
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: ID_ADMIN,
          accion: 'ocultar_publicacion',
          entidad: 'marketplace_publicaciones',
          idEntidad: 40,
          detalle: {
            autor: 15,
            titulo: 'Bicicleta aro 26',
            reportesResueltos: 2,
          },
        },
        mockManager,
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('no debe ocultar dos veces', async () => {
      avisoEnBd = crearAviso({ estadoModeracion: EstadoModeracion.OCULTA });

      await expect(target.ocultar(RED, ID_ADMIN, 40)).rejects.toThrow(
        new ConflictException('El aviso ya está oculto'),
      );
      expect(mockBitacora.registrar).not.toHaveBeenCalled();
    });

    it('debe responder 404 con un aviso de otra comunidad o eliminado', async () => {
      avisoEnBd = null;

      await expect(target.ocultar(RED, ID_ADMIN, 40)).rejects.toThrow(
        new NotFoundException('Aviso no encontrado'),
      );
    });
  });

  describe('restaurar', () => {
    it('debe volver a publicarlo sin tocar los reportes', async () => {
      avisoEnBd = crearAviso({ estadoModeracion: EstadoModeracion.OCULTA });

      await target.restaurar(RED, ID_ADMIN, 40);

      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        {
          estadoModeracion: EstadoModeracion.PUBLICADA,
          moderadoPor: ID_ADMIN,
          moderadoEn: AHORA,
        },
      );
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'restaurar_publicacion',
          detalle: expect.objectContaining({ reportesResueltos: 0 }),
        }),
        mockManager,
      );
    });

    it('no debe restaurar un aviso visible', async () => {
      await expect(target.restaurar(RED, ID_ADMIN, 40)).rejects.toThrow(
        new ConflictException('El aviso no está oculto'),
      );
    });
  });

  describe('descartarReportes', () => {
    it('debe descartar los reportes sin cambiar el aviso', async () => {
      await target.descartarReportes(RED, ID_ADMIN, 40);

      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockManager.update).toHaveBeenCalledWith(MuroReporte, pendientes, {
        estado: EstadoReporte.DESCARTADO,
        resueltoPor: ID_ADMIN,
        resueltoEn: AHORA,
      });
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'descartar_reportes' }),
        mockManager,
      );
    });

    it('debe responder 409 si no hay reportes pendientes', async () => {
      reportesActualizados = 0;

      await expect(target.descartarReportes(RED, ID_ADMIN, 40)).rejects.toThrow(
        new ConflictException('El aviso no tiene reportes pendientes'),
      );
      expect(mockBitacora.registrar).not.toHaveBeenCalled();
    });
  });
});

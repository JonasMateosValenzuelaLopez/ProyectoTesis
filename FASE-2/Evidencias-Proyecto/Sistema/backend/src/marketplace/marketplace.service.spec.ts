import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, IsNull, LessThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { EstadoModeracion } from '../muro/entities/muro-publicacion.entity';
import {
  LugarPublicacion,
  MuroReporte,
} from '../muro/entities/muro-reporte.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  MarketplacePublicacion,
  TipoAviso,
} from './entities/marketplace-publicacion.entity';
import {
  EstadoSolicitudContacto,
  MarketplaceSolicitudContacto,
} from './entities/marketplace-solicitud-contacto.entity';
import { MarketplaceService } from './marketplace.service';

const ID_YO = 8;
const ID_VECINO = 15;
const FECHA = new Date('2026-11-05T15:00:00Z');

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.RESIDENTE],
  modulos: [],
  idsUnidades: [101, 102],
};

const crearAviso = (cambios: Partial<MarketplacePublicacion> = {}) =>
  ({
    idProducto: 40,
    idRed: 3,
    idUsuario: ID_VECINO,
    idUnidad: 200,
    unidad: {
      idUnidad: 200,
      numeroIdentificador: '12',
      torre: null,
    } as Unidad,
    tipo: TipoAviso.VENDO,
    titulo: 'Bicicleta aro 26',
    descripcion: 'En buen estado',
    precio: 45000,
    cerradoEn: null,
    fechaPublicacion: FECHA,
    fechaCreacion: FECHA,
    estadoModeracion: EstadoModeracion.PUBLICADA,
    moderadoPor: null,
    moderadoEn: null,
    ...cambios,
  }) as MarketplacePublicacion;

const crearSolicitud = (cambios: Partial<MarketplaceSolicitudContacto> = {}) =>
  ({
    idSolicitud: 7,
    idProducto: 40,
    idUsuario: ID_YO,
    idUnidad: 101,
    estado: EstadoSolicitudContacto.PENDIENTE,
    respondidaEn: null,
    vista: false,
    fechaCreacion: FECHA,
    ...cambios,
  }) as MarketplaceSolicitudContacto;

const AVISO_SERIALIZADO = {
  idProducto: 40,
  tipo: TipoAviso.VENDO,
  titulo: 'Bicicleta aro 26',
  descripcion: 'En buen estado',
  precio: 45000,
  fecha: FECHA,
  cerradoEn: null,
  autor: { idUsuario: ID_VECINO, nombre: 'Luis Soto' },
  unidad: { idUnidad: 200, numeroIdentificador: '12', torre: null },
  estadoModeracion: EstadoModeracion.PUBLICADA,
  moderadoEn: null,
};

describe('MarketplaceService', () => {
  let target: MarketplaceService;
  let mockAvisosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockSolicitudesRepository: { find: jest.Mock };
  let mockReportesRepository: {
    find: jest.Mock;
    exists: jest.Mock;
    insert: jest.Mock;
  };
  let mockManagerLectura: { find: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    count: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockBitacora: { marcarActividad: jest.Mock };
  let usuarios: Partial<Usuario>[];

  beforeEach(async () => {
    usuarios = [
      {
        idUsuario: ID_VECINO,
        nombre: 'Luis',
        primerApellido: 'Soto',
        segundoApellido: null,
        telefono: '+56911112222',
      },
    ];
    mockAvisosRepository = {
      find: jest.fn().mockResolvedValue([crearAviso()]),
      findOne: jest.fn().mockResolvedValue(crearAviso()),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockSolicitudesRepository = { find: jest.fn().mockResolvedValue([]) };
    mockReportesRepository = {
      find: jest.fn().mockResolvedValue([]),
      exists: jest.fn().mockResolvedValue(false),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idReporte: 90 }] }),
    };
    mockManagerLectura = {
      find: jest.fn(() => Promise.resolve(usuarios)),
    };
    mockManager = {
      findOne: jest
        .fn()
        .mockResolvedValue({ idUsuario: ID_YO, telefono: '+56933334444' }),
      count: jest.fn().mockResolvedValue(0),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idProducto: 40 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacora = { marcarActividad: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        {
          provide: getRepositoryToken(MarketplacePublicacion),
          useValue: mockAvisosRepository,
        },
        {
          provide: getRepositoryToken(MarketplaceSolicitudContacto),
          useValue: mockSolicitudesRepository,
        },
        {
          provide: getRepositoryToken(MuroReporte),
          useValue: mockReportesRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: mockManagerLectura,
            transaction: jest.fn((trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
            ),
          },
        },
        { provide: BitacoraService, useValue: mockBitacora },
      ],
    }).compile();

    target = module.get(MarketplaceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe traer lo publicado de la comunidad y lo propio aunque esté oculto', async () => {
      await target.listar(RED, ID_YO, {});

      expect(mockAvisosRepository.find).toHaveBeenCalledWith({
        where: [
          {
            idRed: 3,
            estadoModeracion: EstadoModeracion.PUBLICADA,
            cerradoEn: IsNull(),
          },
          { idRed: 3, idUsuario: ID_YO },
        ],
        relations: { unidad: true },
        order: { idProducto: 'DESC' },
        take: 51,
      });
    });

    it('debe aplicar el tipo y el cursor en las dos condiciones', async () => {
      await target.listar(RED, ID_YO, {
        tipo: TipoAviso.SERVICIO,
        antesDe: 30,
        limite: 5,
      });

      const comun = {
        idRed: 3,
        tipo: TipoAviso.SERVICIO,
        idProducto: LessThan(30),
      };
      expect(mockAvisosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            {
              ...comun,
              estadoModeracion: EstadoModeracion.PUBLICADA,
              cerradoEn: IsNull(),
            },
            { ...comun, idUsuario: ID_YO },
          ],
          take: 6,
        }),
      );
    });

    it('debe devolver el aviso sin teléfono cuando no hay solicitud', async () => {
      const resultado = await target.listar(RED, ID_YO, {});

      expect(resultado).toEqual({
        avisos: [
          {
            ...AVISO_SERIALIZADO,
            esMia: false,
            reportadaPorMi: false,
            miSolicitud: null,
          },
        ],
        siguiente: null,
      });
    });

    it('debe mostrar el teléfono actual del autor solo si aceptó la solicitud', async () => {
      mockSolicitudesRepository.find.mockResolvedValue([
        crearSolicitud({
          estado: EstadoSolicitudContacto.ACEPTADA,
          respondidaEn: FECHA,
        }),
      ]);

      const { avisos } = await target.listar(RED, ID_YO, {});

      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith({
        where: { idProducto: In([40]), idUsuario: ID_YO },
      });
      expect(avisos[0].miSolicitud).toEqual({
        idSolicitud: 7,
        estado: EstadoSolicitudContacto.ACEPTADA,
        fecha: FECHA,
        respondidaEn: FECHA,
        vista: false,
        telefono: '+56911112222',
      });
    });

    it.each([
      [EstadoSolicitudContacto.PENDIENTE],
      [EstadoSolicitudContacto.RECHAZADA],
    ])('no debe mostrar el teléfono con la solicitud %s', async (estado) => {
      mockSolicitudesRepository.find.mockResolvedValue([
        crearSolicitud({ estado }),
      ]);

      const { avisos } = await target.listar(RED, ID_YO, {});

      expect(avisos[0].miSolicitud?.telefono).toBeNull();
    });

    it('debe marcar los avisos propios y los ya reportados', async () => {
      mockAvisosRepository.find.mockResolvedValue([
        crearAviso({ idProducto: 41, idUsuario: ID_YO }),
        crearAviso(),
      ]);
      mockReportesRepository.find.mockResolvedValue([{ idPublicacion: 40 }]);

      const { avisos } = await target.listar(RED, ID_YO, {});

      expect(mockReportesRepository.find).toHaveBeenCalledWith({
        select: { idPublicacion: true },
        where: {
          tipoPublicacion: LugarPublicacion.MARKETPLACE,
          idPublicacion: In([41, 40]),
          idUsuario: ID_YO,
        },
        withDeleted: true,
      });
      expect(
        avisos.map((a) => [a.idProducto, a.esMia, a.reportadaPorMi]),
      ).toEqual([
        [41, true, false],
        [40, false, true],
      ]);
    });

    it('debe entregar el cursor siguiente cuando hay más avisos', async () => {
      mockAvisosRepository.find.mockResolvedValue([
        crearAviso({ idProducto: 40 }),
        crearAviso({ idProducto: 39 }),
      ]);

      const resultado = await target.listar(RED, ID_YO, { limite: 1 });

      expect(resultado.avisos).toHaveLength(1);
      expect(resultado.siguiente).toBe(40);
    });
  });

  describe('detalle', () => {
    it('debe buscar el aviso publicado o propio de la comunidad', async () => {
      const resultado = await target.detalle(RED, ID_YO, 40);

      expect(mockAvisosRepository.findOne).toHaveBeenCalledWith({
        where: [
          {
            idProducto: 40,
            idRed: 3,
            estadoModeracion: EstadoModeracion.PUBLICADA,
          },
          { idProducto: 40, idRed: 3, idUsuario: ID_YO },
        ],
        relations: { unidad: true },
      });
      expect(resultado).toEqual({
        ...AVISO_SERIALIZADO,
        esMia: false,
        reportadaPorMi: false,
        miSolicitud: null,
      });
    });

    it('debe responder 404 si el aviso no existe, es de otra comunidad o está oculto', async () => {
      mockAvisosRepository.findOne.mockResolvedValue(null);

      await expect(target.detalle(RED, ID_YO, 40)).rejects.toThrow(
        new NotFoundException('Aviso no encontrado'),
      );
    });
  });

  describe('publicar', () => {
    const dto = {
      tipo: TipoAviso.VENDO,
      titulo: 'Bicicleta aro 26',
      precio: 45000,
    };

    it('debe guardar el aviso con la primera vivienda y bloquear la cuenta del autor', async () => {
      await target.publicar(RED, ID_YO, dto);

      expect(mockManager.findOne).toHaveBeenCalledWith(Usuario, {
        select: { idUsuario: true, telefono: true },
        where: { idUsuario: ID_YO },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.count).toHaveBeenCalledWith(MarketplacePublicacion, {
        where: {
          idRed: 3,
          idUsuario: ID_YO,
          estadoModeracion: EstadoModeracion.PUBLICADA,
          cerradoEn: IsNull(),
        },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(MarketplacePublicacion, {
        idRed: 3,
        idUsuario: ID_YO,
        idUnidad: 101,
        tipo: TipoAviso.VENDO,
        titulo: 'Bicicleta aro 26',
        descripcion: null,
        precio: 45000,
      });
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe usar la vivienda indicada si es propia', async () => {
      await target.publicar(RED, ID_YO, { ...dto, idUnidad: 102 });

      expect(mockManager.insert).toHaveBeenCalledWith(
        MarketplacePublicacion,
        expect.objectContaining({ idUnidad: 102 }),
      );
    });

    it('debe guardar sin precio un aviso de Busco', async () => {
      await target.publicar(RED, ID_YO, {
        tipo: TipoAviso.BUSCO,
        titulo: 'Escalera',
        precio: 5000,
      });

      expect(mockManager.insert).toHaveBeenCalledWith(
        MarketplacePublicacion,
        expect.objectContaining({ tipo: TipoAviso.BUSCO, precio: null }),
      );
    });

    it('debe responder 403 si la persona no vive en la comunidad', async () => {
      await expect(
        target.publicar({ ...RED, idsUnidades: [] }, ID_YO, dto),
      ).rejects.toThrow(
        new ForbiddenException(
          'Solo quienes viven en la comunidad pueden publicar en el mercado',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe responder 404 con una vivienda ajena', async () => {
      await expect(
        target.publicar(RED, ID_YO, { ...dto, idUnidad: 999 }),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
    });

    it.each([[null], ['']])(
      'debe exigir teléfono en la cuenta (%j)',
      async (telefono) => {
        mockManager.findOne.mockResolvedValue({ idUsuario: ID_YO, telefono });

        await expect(target.publicar(RED, ID_YO, dto)).rejects.toThrow(
          new ConflictException(
            'Agrega tu teléfono en tu perfil antes de publicar: es el dato que se comparte cuando aceptas a un vecino',
          ),
        );
        expect(mockManager.insert).not.toHaveBeenCalled();
      },
    );

    it('debe limitar los avisos disponibles por persona', async () => {
      mockManager.count.mockResolvedValue(20);

      await expect(target.publicar(RED, ID_YO, dto)).rejects.toThrow(
        new ConflictException(
          'Puedes tener hasta 20 avisos disponibles. Marca alguno como vendido o elimínalo para publicar otro',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('editar', () => {
    const dto = { titulo: 'Bicicleta aro 29', descripcion: 'Casi nueva' };

    beforeEach(() => {
      mockManager.findOne.mockResolvedValue(crearAviso({ idUsuario: ID_YO }));
    });

    it('debe reemplazar título, descripción y precio del aviso propio bloqueado', async () => {
      await target.editar(RED, ID_YO, 40, { ...dto, precio: 40000 });

      expect(mockManager.findOne).toHaveBeenCalledWith(MarketplacePublicacion, {
        where: { idProducto: 40, idRed: 3, idUsuario: ID_YO },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        {
          titulo: 'Bicicleta aro 29',
          descripcion: 'Casi nueva',
          precio: 40000,
        },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe dejar en null lo que no llega', async () => {
      await target.editar(RED, ID_YO, 40, { titulo: 'Bicicleta' });

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        { titulo: 'Bicicleta', descripcion: null, precio: null },
      );
    });

    it('debe responder 404 si el aviso no es propio o es de otra comunidad', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(target.editar(RED, ID_YO, 40, dto)).rejects.toThrow(
        new NotFoundException('Aviso no encontrado'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('no debe editar un aviso oculto por la administración', async () => {
      mockManager.findOne.mockResolvedValue(
        crearAviso({
          idUsuario: ID_YO,
          estadoModeracion: EstadoModeracion.OCULTA,
        }),
      );

      await expect(target.editar(RED, ID_YO, 40, dto)).rejects.toThrow(
        new ConflictException(
          'El aviso está oculto por la administración: no puedes editarlo',
        ),
      );
    });

    it('no debe editar un aviso cerrado', async () => {
      mockManager.findOne.mockResolvedValue(
        crearAviso({ idUsuario: ID_YO, cerradoEn: FECHA }),
      );

      await expect(target.editar(RED, ID_YO, 40, dto)).rejects.toThrow(
        new ConflictException('Reabre el aviso para editarlo'),
      );
    });

    it('debe rechazar precio en un aviso de Busco', async () => {
      mockManager.findOne.mockResolvedValue(
        crearAviso({ idUsuario: ID_YO, tipo: TipoAviso.BUSCO, precio: null }),
      );

      await expect(
        target.editar(RED, ID_YO, 40, { titulo: 'Escalera', precio: 5000 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('cerrar', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: FECHA });
      mockManager.findOne.mockResolvedValue(crearAviso({ idUsuario: ID_YO }));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe marcar el cierre y rechazar las solicitudes pendientes vigentes', async () => {
      await target.cerrar(RED, ID_YO, 40);

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        { cerradoEn: FECHA },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        {
          idProducto: 40,
          estado: EstadoSolicitudContacto.PENDIENTE,
          fechaEliminacion: IsNull(),
        },
        {
          estado: EstadoSolicitudContacto.RECHAZADA,
          respondidaEn: FECHA,
          vista: false,
        },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('no debe cerrar dos veces', async () => {
      mockManager.findOne.mockResolvedValue(
        crearAviso({ idUsuario: ID_YO, cerradoEn: FECHA }),
      );

      await expect(target.cerrar(RED, ID_YO, 40)).rejects.toThrow(
        new ConflictException('El aviso ya está marcado como cerrado'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe responder 404 si el aviso no es propio', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(target.cerrar(RED, ID_YO, 40)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reabrir', () => {
    beforeEach(() => {
      mockManager.findOne.mockResolvedValue(
        crearAviso({ idUsuario: ID_YO, cerradoEn: FECHA }),
      );
    });

    it('debe volver a dejarlo disponible', async () => {
      await target.reabrir(RED, ID_YO, 40);

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        { cerradoEn: null },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe devolver a pendiente solo las solicitudes que rechazó el cierre', async () => {
      await target.reabrir(RED, ID_YO, 40);

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        {
          idProducto: 40,
          estado: EstadoSolicitudContacto.RECHAZADA,
          respondidaEn: FECHA,
          fechaEliminacion: IsNull(),
        },
        {
          estado: EstadoSolicitudContacto.PENDIENTE,
          respondidaEn: null,
          vista: false,
        },
      );
    });

    it('debe bloquear la cuenta del autor y contar sus avisos disponibles', async () => {
      await target.reabrir(RED, ID_YO, 40);

      expect(mockManager.findOne).toHaveBeenCalledWith(Usuario, {
        select: { idUsuario: true, telefono: true },
        where: { idUsuario: ID_YO },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.count).toHaveBeenCalledWith(MarketplacePublicacion, {
        where: {
          idRed: 3,
          idUsuario: ID_YO,
          estadoModeracion: EstadoModeracion.PUBLICADA,
          cerradoEn: IsNull(),
        },
      });
    });

    it('debe permitir reabrir con 19 avisos disponibles', async () => {
      mockManager.count.mockResolvedValue(19);

      await target.reabrir(RED, ID_YO, 40);

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplacePublicacion,
        { idProducto: 40 },
        { cerradoEn: null },
      );
    });

    it('no debe reabrir un aviso que no está cerrado', async () => {
      mockManager.findOne.mockResolvedValue(crearAviso({ idUsuario: ID_YO }));

      await expect(target.reabrir(RED, ID_YO, 40)).rejects.toThrow(
        new ConflictException('El aviso no está cerrado'),
      );
    });

    it('debe respetar el límite de avisos disponibles', async () => {
      mockManager.count.mockResolvedValue(20);

      await expect(target.reabrir(RED, ID_YO, 40)).rejects.toThrow(
        new ConflictException(
          'Puedes tener hasta 20 avisos disponibles. Marca alguno como vendido o elimínalo para reabrir este',
        ),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('eliminarPropio', () => {
    it('debe hacer borrado lógico solo del aviso propio de la comunidad', async () => {
      await target.eliminarPropio(RED, ID_YO, 40);

      expect(mockAvisosRepository.softDelete).toHaveBeenCalledWith({
        idProducto: 40,
        idRed: 3,
        idUsuario: ID_YO,
      });
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe responder 404 si el aviso no es propio', async () => {
      mockAvisosRepository.softDelete.mockResolvedValue({ affected: 0 });

      await expect(target.eliminarPropio(RED, ID_YO, 40)).rejects.toThrow(
        new NotFoundException('Aviso no encontrado'),
      );
      expect(mockBitacora.marcarActividad).not.toHaveBeenCalled();
    });
  });

  describe('reportar', () => {
    const dto = { motivo: 'Es una estafa' };

    it('debe registrar el reporte del marketplace con la comunidad del contexto', async () => {
      const resultado = await target.reportar(RED, ID_YO, 40, dto);

      expect(mockAvisosRepository.findOne).toHaveBeenCalledWith({
        where: {
          idProducto: 40,
          idRed: 3,
          estadoModeracion: EstadoModeracion.PUBLICADA,
        },
      });
      expect(mockReportesRepository.insert).toHaveBeenCalledWith({
        idRed: 3,
        tipoPublicacion: LugarPublicacion.MARKETPLACE,
        idPublicacion: 40,
        idUsuario: ID_YO,
        motivo: 'Es una estafa',
      });
      expect(resultado).toEqual({ idReporte: 90 });
    });

    it('debe responder 404 si el aviso no está publicado en la comunidad', async () => {
      mockAvisosRepository.findOne.mockResolvedValue(null);

      await expect(target.reportar(RED, ID_YO, 40, dto)).rejects.toThrow(
        new NotFoundException('Aviso no encontrado'),
      );
    });

    it('no debe dejar reportar el aviso propio', async () => {
      mockAvisosRepository.findOne.mockResolvedValue(
        crearAviso({ idUsuario: ID_YO }),
      );

      await expect(target.reportar(RED, ID_YO, 40, dto)).rejects.toThrow(
        new BadRequestException('No puedes reportar tu propia publicación'),
      );
    });

    it('no debe dejar reportar dos veces, aunque el reporte esté eliminado', async () => {
      mockReportesRepository.exists.mockResolvedValue(true);

      await expect(target.reportar(RED, ID_YO, 40, dto)).rejects.toThrow(
        new ConflictException('Ya reportaste esta publicación'),
      );
      expect(mockReportesRepository.exists).toHaveBeenCalledWith({
        where: {
          tipoPublicacion: LugarPublicacion.MARKETPLACE,
          idPublicacion: 40,
          idUsuario: ID_YO,
        },
        withDeleted: true,
      });
    });
  });
});

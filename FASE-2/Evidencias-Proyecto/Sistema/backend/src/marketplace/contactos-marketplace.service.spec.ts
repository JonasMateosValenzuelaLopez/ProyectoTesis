import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { EstadoModeracion } from '../muro/entities/muro-publicacion.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ContactosMarketplaceService } from './contactos-marketplace.service';
import {
  MarketplacePublicacion,
  TipoAviso,
} from './entities/marketplace-publicacion.entity';
import {
  EstadoSolicitudContacto,
  MarketplaceSolicitudContacto,
} from './entities/marketplace-solicitud-contacto.entity';

const ID_INTERESADO = 8;
const ID_AUTOR = 15;
const AHORA = new Date('2026-11-06T13:00:00Z');
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
    idUsuario: ID_AUTOR,
    tipo: TipoAviso.VENDO,
    titulo: 'Bicicleta aro 26',
    estadoModeracion: EstadoModeracion.PUBLICADA,
    cerradoEn: null,
    ...cambios,
  }) as MarketplacePublicacion;

const crearSolicitud = (cambios: Partial<MarketplaceSolicitudContacto> = {}) =>
  ({
    idSolicitud: 7,
    idProducto: 40,
    producto: crearAviso(),
    idUsuario: ID_INTERESADO,
    idUnidad: 101,
    unidad: {
      idUnidad: 101,
      numeroIdentificador: '4',
      torre: null,
    } as Unidad,
    estado: EstadoSolicitudContacto.PENDIENTE,
    respondidaEn: null,
    vista: false,
    fechaCreacion: FECHA,
    fechaEliminacion: null,
    ...cambios,
  }) as MarketplaceSolicitudContacto;

const USUARIOS = [
  {
    idUsuario: ID_INTERESADO,
    nombre: 'Ana',
    primerApellido: 'Rojas',
    segundoApellido: null,
    telefono: '+56933334444',
  },
  {
    idUsuario: ID_AUTOR,
    nombre: 'Luis',
    primerApellido: 'Soto',
    segundoApellido: null,
    telefono: '+56911112222',
  },
] as Usuario[];

describe('ContactosMarketplaceService', () => {
  let target: ContactosMarketplaceService;
  let mockSolicitudesRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    softDelete: jest.Mock;
    update: jest.Mock;
  };
  let mockManagerLectura: { find: jest.Mock };
  let mockManager: { findOne: jest.Mock; update: jest.Mock; insert: jest.Mock };
  let mockBitacora: { marcarActividad: jest.Mock };
  let avisoEnBd: MarketplacePublicacion | null;
  let existente: MarketplaceSolicitudContacto | null;
  let usuarios: Usuario[];

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    avisoEnBd = crearAviso();
    existente = null;
    usuarios = USUARIOS;
    mockSolicitudesRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(crearSolicitud()),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockManagerLectura = {
      find: jest.fn(() => Promise.resolve(usuarios)),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === MarketplacePublicacion ? avisoEnBd : existente,
        ),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idSolicitud: 7 }] }),
    };
    mockBitacora = { marcarActividad: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        ContactosMarketplaceService,
        {
          provide: getRepositoryToken(MarketplaceSolicitudContacto),
          useValue: mockSolicitudesRepository,
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

    target = module.get(ContactosMarketplaceService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe buscar las recibidas en avisos propios y las enviadas, solo de avisos publicados de la comunidad', async () => {
      await target.listar(RED, ID_INTERESADO);

      const visible = {
        idRed: 3,
        estadoModeracion: EstadoModeracion.PUBLICADA,
      };
      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith({
        where: { producto: { ...visible, idUsuario: ID_INTERESADO } },
        relations: { producto: true, unidad: true },
        order: { idSolicitud: 'DESC' },
        take: 200,
      });
      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith({
        where: { idUsuario: ID_INTERESADO, producto: visible },
        relations: { producto: true },
        order: { idSolicitud: 'DESC' },
        take: 200,
      });
    });

    it('debe mostrar al autor quién pidió contacto sin exponer su teléfono', async () => {
      mockSolicitudesRepository.find
        .mockResolvedValueOnce([crearSolicitud()])
        .mockResolvedValueOnce([]);

      const resultado = await target.listar(RED, ID_AUTOR);

      expect(resultado).toEqual({
        recibidas: [
          {
            idSolicitud: 7,
            estado: EstadoSolicitudContacto.PENDIENTE,
            fecha: FECHA,
            respondidaEn: null,
            aviso: { idProducto: 40, titulo: 'Bicicleta aro 26' },
            interesado: { idUsuario: ID_INTERESADO, nombre: 'Ana Rojas' },
            unidad: { idUnidad: 101, numeroIdentificador: '4', torre: null },
          },
        ],
        enviadas: [],
      });
    });

    it('debe entregar al interesado el teléfono del autor solo si aceptó', async () => {
      mockSolicitudesRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          crearSolicitud({
            estado: EstadoSolicitudContacto.ACEPTADA,
            respondidaEn: FECHA,
          }),
          crearSolicitud({
            idSolicitud: 9,
            idProducto: 41,
            producto: crearAviso({ idProducto: 41, titulo: 'Mesa' }),
            estado: EstadoSolicitudContacto.RECHAZADA,
            respondidaEn: FECHA,
            vista: true,
          }),
        ]);

      const { enviadas } = await target.listar(RED, ID_INTERESADO);

      expect(enviadas).toEqual([
        {
          idSolicitud: 7,
          estado: EstadoSolicitudContacto.ACEPTADA,
          fecha: FECHA,
          respondidaEn: FECHA,
          vista: false,
          aviso: {
            idProducto: 40,
            titulo: 'Bicicleta aro 26',
            tipo: TipoAviso.VENDO,
          },
          autor: { idUsuario: ID_AUTOR, nombre: 'Luis Soto' },
          telefono: '+56911112222',
        },
        {
          idSolicitud: 9,
          estado: EstadoSolicitudContacto.RECHAZADA,
          fecha: FECHA,
          respondidaEn: FECHA,
          vista: true,
          aviso: { idProducto: 41, titulo: 'Mesa', tipo: TipoAviso.VENDO },
          autor: { idUsuario: ID_AUTOR, nombre: 'Luis Soto' },
          telefono: null,
        },
      ]);
    });

    it('debe omitir las solicitudes cuyo aviso fue eliminado', async () => {
      mockSolicitudesRepository.find
        .mockResolvedValueOnce([crearSolicitud({ producto: null })])
        .mockResolvedValueOnce([crearSolicitud({ producto: null })]);

      const resultado = await target.listar(RED, ID_AUTOR);

      expect(resultado).toEqual({ recibidas: [], enviadas: [] });
    });
  });

  describe('pedir', () => {
    it('debe crear la solicitud con la primera vivienda y bloquear el aviso', async () => {
      const resultado = await target.pedir(RED, ID_INTERESADO, 40, {});

      expect(mockManager.findOne).toHaveBeenCalledWith(MarketplacePublicacion, {
        where: {
          idProducto: 40,
          idRed: 3,
          estadoModeracion: EstadoModeracion.PUBLICADA,
        },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        {
          where: { idProducto: 40, idUsuario: ID_INTERESADO },
          withDeleted: true,
        },
      );
      expect(mockManager.insert).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        { idProducto: 40, idUsuario: ID_INTERESADO, idUnidad: 101 },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
      expect(resultado.telefono).toBeNull();
      expect(resultado.autor).toEqual({
        idUsuario: ID_AUTOR,
        nombre: 'Luis Soto',
      });
    });

    it('debe reactivar una solicitud que el interesado había cancelado', async () => {
      existente = crearSolicitud({
        estado: EstadoSolicitudContacto.PENDIENTE,
        fechaEliminacion: FECHA,
      });

      await target.pedir(RED, ID_INTERESADO, 40, { idUnidad: 102 });

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        { idSolicitud: 7 },
        {
          idUnidad: 102,
          estado: EstadoSolicitudContacto.PENDIENTE,
          respondidaEn: null,
          vista: false,
          fechaEliminacion: null,
        },
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it.each([
      [
        EstadoSolicitudContacto.PENDIENTE,
        'Ya le pediste contacto por este aviso. Espera su respuesta',
      ],
      [EstadoSolicitudContacto.ACEPTADA, 'Ya tienes el contacto de este aviso'],
      [EstadoSolicitudContacto.RECHAZADA, 'Este aviso ya no está disponible'],
    ])(
      'debe responder 409 si ya existe una solicitud %s',
      async (estado, mensaje) => {
        existente = crearSolicitud({ estado });

        await expect(target.pedir(RED, ID_INTERESADO, 40, {})).rejects.toThrow(
          new ConflictException(mensaje),
        );
        expect(mockManager.insert).not.toHaveBeenCalled();
        expect(mockManager.update).not.toHaveBeenCalled();
      },
    );

    it('debe responder 403 si la persona no vive en la comunidad', async () => {
      await expect(
        target.pedir({ ...RED, idsUnidades: [] }, ID_INTERESADO, 40, {}),
      ).rejects.toThrow(
        new ForbiddenException(
          'Solo quienes viven en la comunidad pueden contactar avisos del mercado',
        ),
      );
    });

    it('debe responder 404 con una vivienda ajena', async () => {
      await expect(
        target.pedir(RED, ID_INTERESADO, 40, { idUnidad: 999 }),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
    });

    it('debe responder 404 si el aviso no está publicado en la comunidad', async () => {
      avisoEnBd = null;

      await expect(target.pedir(RED, ID_INTERESADO, 40, {})).rejects.toThrow(
        new NotFoundException('Aviso no encontrado'),
      );
    });

    it('no debe dejar pedir contacto por el aviso propio', async () => {
      avisoEnBd = crearAviso({ idUsuario: ID_INTERESADO });

      await expect(target.pedir(RED, ID_INTERESADO, 40, {})).rejects.toThrow(
        new BadRequestException('No puedes pedir contacto por tu propio aviso'),
      );
    });

    it('no debe dejar pedir contacto por un aviso cerrado', async () => {
      avisoEnBd = crearAviso({ cerradoEn: FECHA });

      await expect(target.pedir(RED, ID_INTERESADO, 40, {})).rejects.toThrow(
        new ConflictException('Este aviso ya no está disponible'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('debe hacer borrado lógico de la solicitud pendiente propia', async () => {
      await target.cancelar(RED, ID_INTERESADO, 7);

      expect(mockSolicitudesRepository.findOne).toHaveBeenCalledWith({
        where: {
          idSolicitud: 7,
          idUsuario: ID_INTERESADO,
          producto: { idRed: 3 },
        },
        relations: { producto: true },
      });
      expect(mockSolicitudesRepository.softDelete).toHaveBeenCalledWith({
        idSolicitud: 7,
        idUsuario: ID_INTERESADO,
        estado: EstadoSolicitudContacto.PENDIENTE,
      });
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it.each([[null], [crearSolicitud({ producto: null })]])(
      'debe responder 404 si la solicitud no es propia o su aviso no existe',
      async (fila) => {
        mockSolicitudesRepository.findOne.mockResolvedValue(fila);

        await expect(target.cancelar(RED, ID_INTERESADO, 7)).rejects.toThrow(
          new NotFoundException('Solicitud no encontrada'),
        );
      },
    );

    it('no debe cancelar una solicitud ya respondida', async () => {
      mockSolicitudesRepository.findOne.mockResolvedValue(
        crearSolicitud({ estado: EstadoSolicitudContacto.ACEPTADA }),
      );

      await expect(target.cancelar(RED, ID_INTERESADO, 7)).rejects.toThrow(
        new ConflictException(
          'Solo puedes cancelar una solicitud que aún no tiene respuesta',
        ),
      );
      expect(mockSolicitudesRepository.softDelete).not.toHaveBeenCalled();
    });

    it('debe responder 409 si el autor respondió mientras se cancelaba', async () => {
      mockSolicitudesRepository.softDelete.mockResolvedValue({ affected: 0 });

      await expect(target.cancelar(RED, ID_INTERESADO, 7)).rejects.toThrow(
        ConflictException,
      );
      expect(mockBitacora.marcarActividad).not.toHaveBeenCalled();
    });
  });

  describe('responder', () => {
    it('debe aceptar con el aviso bloqueado y un UPDATE condicional sobre la solicitud pendiente y vigente', async () => {
      const resultado = await target.responder(RED, ID_AUTOR, 7, {
        aceptada: true,
      });

      expect(mockSolicitudesRepository.findOne).toHaveBeenCalledWith({
        where: { idSolicitud: 7, producto: { idRed: 3, idUsuario: ID_AUTOR } },
        relations: { producto: true, unidad: true },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(MarketplacePublicacion, {
        where: { idProducto: 40, idRed: 3, idUsuario: ID_AUTOR },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        {
          idSolicitud: 7,
          estado: EstadoSolicitudContacto.PENDIENTE,
          fechaEliminacion: IsNull(),
        },
        {
          estado: EstadoSolicitudContacto.ACEPTADA,
          respondidaEn: AHORA,
          vista: false,
        },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
      expect(resultado).toEqual({
        idSolicitud: 7,
        estado: EstadoSolicitudContacto.ACEPTADA,
        fecha: FECHA,
        respondidaEn: AHORA,
        aviso: { idProducto: 40, titulo: 'Bicicleta aro 26' },
        interesado: { idUsuario: ID_INTERESADO, nombre: 'Ana Rojas' },
        unidad: { idUnidad: 101, numeroIdentificador: '4', torre: null },
      });
    });

    it('debe rechazar sin exigir teléfono', async () => {
      usuarios = [];

      await target.responder(RED, ID_AUTOR, 7, { aceptada: false });

      expect(mockManager.update).toHaveBeenCalledWith(
        MarketplaceSolicitudContacto,
        expect.anything(),
        {
          estado: EstadoSolicitudContacto.RECHAZADA,
          respondidaEn: AHORA,
          vista: false,
        },
      );
    });

    it('debe exigir teléfono al autor para aceptar', async () => {
      usuarios = [{ ...USUARIOS[1], telefono: null }];

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: true }),
      ).rejects.toThrow(
        new ConflictException(
          'Agrega tu teléfono en tu perfil antes de aceptar: es el dato que se comparte con tu vecino',
        ),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe responder 404 si la solicitud no es de un aviso propio de la comunidad', async () => {
      mockSolicitudesRepository.findOne.mockResolvedValue(null);

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: true }),
      ).rejects.toThrow(new NotFoundException('Solicitud no encontrada'));
    });

    it('debe responder 404 si el aviso desapareció antes de bloquearlo', async () => {
      avisoEnBd = null;

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: true }),
      ).rejects.toThrow(new NotFoundException('Solicitud no encontrada'));
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('no debe responder si el aviso bloqueado está oculto', async () => {
      avisoEnBd = crearAviso({ estadoModeracion: EstadoModeracion.OCULTA });

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: true }),
      ).rejects.toThrow(
        new ConflictException(
          'El aviso está oculto por la administración: no puedes responder solicitudes',
        ),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('no debe responder dos veces', async () => {
      mockSolicitudesRepository.findOne.mockResolvedValue(
        crearSolicitud({ estado: EstadoSolicitudContacto.RECHAZADA }),
      );

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: true }),
      ).rejects.toThrow(
        new ConflictException('Esta solicitud ya fue respondida'),
      );
    });

    it('no debe responder si el aviso bloqueado está cerrado', async () => {
      avisoEnBd = crearAviso({ cerradoEn: FECHA });

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: true }),
      ).rejects.toThrow(
        new ConflictException(
          'El aviso está cerrado: reábrelo para responder solicitudes',
        ),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe responder 409 si la solicitud cambió antes del UPDATE', async () => {
      mockManager.update.mockResolvedValue({ affected: 0 });

      await expect(
        target.responder(RED, ID_AUTOR, 7, { aceptada: false }),
      ).rejects.toThrow(
        new ConflictException('Esta solicitud ya fue respondida'),
      );
      expect(mockBitacora.marcarActividad).not.toHaveBeenCalled();
    });
  });

  describe('marcarVista', () => {
    it('debe marcar vista la respuesta de una solicitud propia', async () => {
      mockSolicitudesRepository.findOne.mockResolvedValue(
        crearSolicitud({ estado: EstadoSolicitudContacto.ACEPTADA }),
      );

      await target.marcarVista(RED, ID_INTERESADO, 7);

      expect(mockSolicitudesRepository.update).toHaveBeenCalledWith(
        {
          idSolicitud: 7,
          idUsuario: ID_INTERESADO,
          fechaEliminacion: IsNull(),
        },
        { vista: true },
      );
    });

    it('no debe escribir si ya estaba vista', async () => {
      mockSolicitudesRepository.findOne.mockResolvedValue(
        crearSolicitud({
          estado: EstadoSolicitudContacto.RECHAZADA,
          vista: true,
        }),
      );

      await target.marcarVista(RED, ID_INTERESADO, 7);

      expect(mockSolicitudesRepository.update).not.toHaveBeenCalled();
    });

    it('debe responder 409 si aún no hay respuesta', async () => {
      await expect(target.marcarVista(RED, ID_INTERESADO, 7)).rejects.toThrow(
        new ConflictException('La solicitud aún no tiene respuesta'),
      );
    });

    it('debe responder 404 si la solicitud no es propia', async () => {
      mockSolicitudesRepository.findOne.mockResolvedValue(null);

      await expect(target.marcarVista(RED, ID_INTERESADO, 7)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

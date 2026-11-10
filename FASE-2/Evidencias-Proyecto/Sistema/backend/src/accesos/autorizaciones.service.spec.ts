import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { AutorizacionesService } from './autorizaciones.service';
import { CategoriaAcceso } from './entities/invitacion.entity';
import {
  EstadoAutorizacion,
  MetodoAcceso,
  RegistroAcceso,
  ViaAutorizacion,
} from './entities/registro-acceso.entity';

const AHORA = new Date('2026-11-06T15:00:00Z');
const LIMITE = new Date('2026-11-06T14:30:00Z');
const ID_LUIS = 3;

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.RESIDENTE],
  modulos: [],
  idsUnidades: [102],
};

const ACCESO = {
  idAcceso: 9,
  idRed: 3,
  visitante: { nombre: 'Rappi', apellido: '' },
  idUnidad: 102,
  unidad: { idUnidad: 102, numeroIdentificador: '102', torre: 'A' },
  idInvitacion: null,
  categoria: CategoriaAcceso.DELIVERY,
  patente: null,
  estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
  autorizadoVia: null,
  autorizadoPor: null,
  validadoPor: 4,
  metodo: MetodoAcceso.MANUAL,
  fechaCreacion: AHORA,
  fechaIngreso: null,
  fechaSalida: null,
} as unknown as RegistroAcceso;

describe('AutorizacionesService', () => {
  let target: AutorizacionesService;
  let mockAccesosRepository: {
    find: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let mockBitacora: { marcarActividad: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    mockAccesosRepository = {
      find: jest.fn().mockResolvedValue([ACCESO]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(ACCESO),
    };
    mockBitacora = { marcarActividad: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        AutorizacionesService,
        {
          provide: getRepositoryToken(RegistroAcceso),
          useValue: mockAccesosRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: {
              find: jest
                .fn()
                .mockResolvedValue([
                  { idUsuario: 4, nombre: 'Carlos', primerApellido: 'Garita' },
                ]),
            },
          },
        },
        { provide: BitacoraService, useValue: mockBitacora },
      ],
    }).compile();

    target = module.get(AutorizacionesService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('pendientes', () => {
    it('debe traer solo las llegadas pendientes y no vencidas de las viviendas propias', async () => {
      const resultado = await target.pendientes(RED);

      expect(mockAccesosRepository.find).toHaveBeenCalledWith({
        where: {
          idRed: 3,
          idUnidad: In([102]),
          estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
          fechaCreacion: MoreThan(LIMITE),
        },
        relations: { visitante: true, unidad: true },
        order: { idAcceso: 'ASC' },
      });
      expect(resultado).toEqual({
        porAutorizar: [
          {
            idAcceso: 9,
            visitante: 'Rappi',
            categoria: CategoriaAcceso.DELIVERY,
            patente: null,
            unidad: { idUnidad: 102, numeroIdentificador: '102', torre: 'A' },
            idInvitacion: null,
            estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
            autorizadoVia: null,
            autorizadoPor: null,
            registradoPor: { idUsuario: 4, nombre: 'Carlos Garita' },
            metodo: MetodoAcceso.MANUAL,
            llegada: AHORA,
            ingresoEn: null,
            salidaEn: null,
          },
        ],
      });
    });

    it('debe responder vacío sin consultar a quien no vive en la comunidad', async () => {
      const resultado = await target.pendientes({ ...RED, idsUnidades: [] });

      expect(resultado).toEqual({ porAutorizar: [] });
      expect(mockAccesosRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('responder', () => {
    it('debe aprobar desde la app a nombre de quien responde, solo si la llegada no venció', async () => {
      await target.responder(RED, ID_LUIS, 9, { aprobado: true });

      expect(mockAccesosRepository.update).toHaveBeenCalledWith(
        {
          idAcceso: 9,
          idRed: 3,
          idUnidad: In([102]),
          estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
          fechaCreacion: MoreThan(LIMITE),
          fechaEliminacion: IsNull(),
        },
        {
          estadoAutorizacion: EstadoAutorizacion.APROBADO,
          autorizadoVia: ViaAutorizacion.APP,
          autorizadoPor: ID_LUIS,
          fechaIngreso: AHORA,
        },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe rechazar sin hora de ingreso pero con la vía, como exigen los CHECK', async () => {
      await target.responder(RED, ID_LUIS, 9, { aprobado: false });

      expect(mockAccesosRepository.update).toHaveBeenCalledWith(
        expect.anything(),
        {
          estadoAutorizacion: EstadoAutorizacion.RECHAZADO,
          autorizadoVia: ViaAutorizacion.APP,
          autorizadoPor: ID_LUIS,
          fechaIngreso: null,
        },
      );
    });

    it('debe responder 404 con una llegada a otra vivienda', async () => {
      mockAccesosRepository.update.mockResolvedValue({ affected: 0 });
      mockAccesosRepository.findOne.mockResolvedValue(null);

      await expect(
        target.responder(RED, ID_LUIS, 9, { aprobado: true }),
      ).rejects.toThrow(new NotFoundException('Ingreso no encontrado'));
      expect(mockAccesosRepository.findOne).toHaveBeenCalledWith({
        where: { idAcceso: 9, idRed: 3, idUnidad: In([102]) },
      });
    });

    it.each([
      [EstadoAutorizacion.APROBADO, 'Este ingreso ya fue aprobado'],
      [EstadoAutorizacion.RECHAZADO, 'Este ingreso ya fue rechazado'],
      [
        EstadoAutorizacion.PENDIENTE,
        'La solicitud de ingreso expiró: la conserjería debe registrar la llegada de nuevo',
      ],
    ])(
      'debe responder 409 según lo que ya tiene la llegada (%s)',
      async (estadoAutorizacion, mensaje) => {
        mockAccesosRepository.update.mockResolvedValue({ affected: 0 });
        mockAccesosRepository.findOne.mockResolvedValue({
          ...ACCESO,
          estadoAutorizacion,
        });

        await expect(
          target.responder(RED, ID_LUIS, 9, { aprobado: true }),
        ).rejects.toThrow(new ConflictException(mensaje));
        expect(mockBitacora.marcarActividad).not.toHaveBeenCalled();
      },
    );

    it('debe responder 404 si la llegada desaparece justo después de responder', async () => {
      mockAccesosRepository.findOne.mockResolvedValue(null);

      await expect(
        target.responder(RED, ID_LUIS, 9, { aprobado: true }),
      ).rejects.toThrow(new NotFoundException('Ingreso no encontrado'));
    });

    it('debe responder 404 sin consultar a quien no vive en la comunidad', async () => {
      await expect(
        target.responder({ ...RED, idsUnidades: [] }, ID_LUIS, 9, {
          aprobado: true,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(mockAccesosRepository.update).not.toHaveBeenCalled();
    });
  });
});

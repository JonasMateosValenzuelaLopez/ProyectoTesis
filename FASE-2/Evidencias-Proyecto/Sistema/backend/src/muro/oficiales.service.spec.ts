import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from '../finanzas/entities/notificacion-enviada.entity';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import {
  EstadoAprobacion,
  MuroPublicacion,
  TipoPublicacion,
} from './entities/muro-publicacion.entity';
import { OficialesService } from './oficiales.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('OficialesService', () => {
  let target: OficialesService;
  let mockManager: {
    insert: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    findOne: jest.Mock;
    findOneByOrFail: jest.Mock;
    find: jest.Mock;
  };
  let mockBitacora: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCorreos: {
    destinatarios: jest.Mock;
    enviarEnSegundoPlano: jest.Mock;
  };
  let enBd: MuroPublicacion | null;

  const red = (roles: RolUsuario[]): ContextoRed => ({
    idRed: 3,
    roles,
    modulos: [],
    idsUnidades: [],
  });

  const comunicado = (cambios: Partial<MuroPublicacion> = {}) =>
    ({
      idPublicacion: 50,
      idRed: 3,
      idUsuario: 6,
      tipo: TipoPublicacion.COMUNICADO,
      titulo: 'Corte de agua',
      contenido: 'Mañana se corta el agua entre las 9:00 y las 13:00.',
      estadoAprobacion: EstadoAprobacion.PENDIENTE,
      aprobadoPor: null,
      aprobadoEn: null,
      moderadoPor: null,
      ...cambios,
    }) as MuroPublicacion;

  const dto = {
    tipo: TipoPublicacion.COMUNICADO,
    titulo: 'Corte de agua',
    contenido: 'Mañana se corta el agua entre las 9:00 y las 13:00.',
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    enBd = comunicado();
    mockManager = {
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idPublicacion: 50 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn(() => Promise.resolve(enBd)),
      findOneByOrFail: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === MuroPublicacion ? comunicado() : { nombre: 'Villa Sol' },
        ),
      ),
      find: jest.fn().mockResolvedValue([{ idUnidad: 1 }, { idUnidad: 2 }]),
    };
    mockBitacora = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    mockCorreos = {
      destinatarios: jest
        .fn()
        .mockResolvedValue([
          { idUsuario: 9, nombre: 'Rosa', correo: 'r@p.cl', idsUnidad: [1] },
        ]),
      enviarEnSegundoPlano: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        OficialesService,
        {
          provide: getRepositoryToken(MuroPublicacion),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            findOneOrFail: jest.fn().mockResolvedValue(comunicado()),
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
        { provide: CorreosComunidadService, useValue: mockCorreos },
      ],
    }).compile();

    target = module.get(OficialesService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('publicar', () => {
    it('lo que redacta la Secretaría debe quedar pendiente y sin correo', async () => {
      const resultado = await target.publicar(
        red([RolUsuario.SECRETARIO]),
        6,
        dto,
      );

      expect(mockManager.insert).toHaveBeenCalledWith(MuroPublicacion, {
        idRed: 3,
        idUsuario: 6,
        idUnidad: null,
        tipo: TipoPublicacion.COMUNICADO,
        titulo: 'Corte de agua',
        contenido: dto.contenido,
        estadoAprobacion: EstadoAprobacion.PENDIENTE,
        aprobadoPor: null,
        aprobadoEn: null,
      });
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'enviar_oficial_a_aprobacion' }),
        mockManager,
      );
      expect(mockCorreos.enviarEnSegundoPlano).not.toHaveBeenCalled();
      expect(resultado.correos).toBe(0);
    });

    it('lo que publica la Presidencia debe quedar aprobado y avisar por correo a los residentes', async () => {
      const resultado = await target.publicar(
        red([RolUsuario.PRESIDENTE]),
        4,
        dto,
      );

      expect(mockManager.insert).toHaveBeenCalledWith(
        MuroPublicacion,
        expect.objectContaining({
          estadoAprobacion: EstadoAprobacion.APROBADA,
          aprobadoPor: 4,
          aprobadoEn: AHORA,
        }),
      );
      expect(mockCorreos.destinatarios).toHaveBeenCalledWith(
        mockManager,
        3,
        [1, 2],
      );
      expect(mockManager.insert).toHaveBeenCalledWith(NotificacionEnviada, {
        idRed: 3,
        tipo: TipoNotificacion.NUEVO_COMUNICADO,
        asunto: 'Corte de agua',
        idPublicacion: 50,
        destinatarios: 1,
        enviadoPor: 4,
      });
      expect(mockCorreos.enviarEnSegundoPlano).toHaveBeenCalledWith([
        expect.objectContaining({
          para: 'r@p.cl',
          asunto: 'Comunicado de Villa Sol: Corte de agua',
        }),
      ]);
      expect(resultado.correos).toBe(1);
    });
  });

  describe('decidir', () => {
    it('al aprobar debe publicar y avisar por correo', async () => {
      await target.decidir(red([RolUsuario.PRESIDENTE]), 4, 50, {
        aprobado: true,
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        MuroPublicacion,
        { idPublicacion: 50 },
        {
          estadoAprobacion: EstadoAprobacion.APROBADA,
          aprobadoPor: 4,
          aprobadoEn: AHORA,
        },
      );
      expect(mockCorreos.enviarEnSegundoPlano).toHaveBeenCalled();
    });

    it('al rechazar no debe enviar correos', async () => {
      await target.decidir(red([RolUsuario.PRESIDENTE]), 4, 50, {
        aprobado: false,
        comentario: 'Falta fecha',
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        MuroPublicacion,
        { idPublicacion: 50 },
        expect.objectContaining({
          estadoAprobacion: EstadoAprobacion.RECHAZADA,
        }),
      );
      expect(mockCorreos.enviarEnSegundoPlano).not.toHaveBeenCalled();
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'rechazar_oficial',
          detalle: expect.objectContaining({ comentario: 'Falta fecha' }),
        }),
        mockManager,
      );
    });

    it('no debe decidir dos veces', async () => {
      enBd = comunicado({ estadoAprobacion: EstadoAprobacion.APROBADA });

      await expect(
        target.decidir(red([RolUsuario.PRESIDENTE]), 4, 50, { aprobado: true }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe responder 404 por una publicación que no es oficial o es de otra comunidad', async () => {
      enBd = null;

      await expect(
        target.decidir(red([RolUsuario.PRESIDENTE]), 4, 50, { aprobado: true }),
      ).rejects.toThrow(new NotFoundException('Publicación no encontrada'));
    });
  });

  describe('eliminar', () => {
    it('debe buscar solo oficiales de la comunidad y bloquear la fila', async () => {
      await target.eliminar(red([RolUsuario.SECRETARIO]), 6, 50);

      expect(mockManager.findOne).toHaveBeenCalledWith(MuroPublicacion, {
        where: {
          idPublicacion: 50,
          idRed: 3,
          tipo: In([TipoPublicacion.COMUNICADO, TipoPublicacion.NORMA]),
        },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('debe dejar al autor borrar lo suyo y registrarlo en la bitácora', async () => {
      await target.eliminar(red([RolUsuario.TESORERO]), 6, 50);

      expect(mockManager.softDelete).toHaveBeenCalledWith(MuroPublicacion, {
        idPublicacion: 50,
      });
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'eliminar_oficial',
          idEntidad: 50,
          detalle: {
            tipo: TipoPublicacion.COMUNICADO,
            titulo: 'Corte de agua',
            estadoAprobacion: EstadoAprobacion.PENDIENTE,
            autor: 6,
          },
        }),
        mockManager,
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe dejar a la Presidencia borrar lo publicado por otra persona', async () => {
      enBd = comunicado({ estadoAprobacion: EstadoAprobacion.APROBADA });

      await target.eliminar(red([RolUsuario.PRESIDENTE]), 4, 50);

      expect(mockManager.softDelete).toHaveBeenCalled();
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          idUsuario: 4,
          detalle: expect.objectContaining({
            estadoAprobacion: EstadoAprobacion.APROBADA,
            autor: 6,
          }),
        }),
        mockManager,
      );
    });

    it('no debe dejar a otro cargo borrar lo publicado por otra persona', async () => {
      await expect(
        target.eliminar(red([RolUsuario.ADMINISTRADOR]), 8, 50),
      ).rejects.toThrow(
        new ForbiddenException('Solo puedes borrar lo que tú publicaste'),
      );

      expect(mockManager.softDelete).not.toHaveBeenCalled();
      expect(mockBitacora.registrar).not.toHaveBeenCalled();
    });

    it('debe responder 404 por una publicación que no es oficial o es de otra comunidad', async () => {
      enBd = null;

      await expect(
        target.eliminar(red([RolUsuario.PRESIDENTE]), 4, 50),
      ).rejects.toThrow(new NotFoundException('Publicación no encontrada'));
    });
  });
});

import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { BitacoraService } from './bitacora.service';
import {
  AmbitoBitacora,
  BitacoraAuditoria,
} from './entities/bitacora-auditoria.entity';

const AHORA = new Date('2026-10-26T12:00:00.000Z');

describe('BitacoraService', () => {
  let target: BitacoraService;
  let mockManagerGlobal: { update: jest.Mock };
  let mockManager: { create: jest.Mock; save: jest.Mock; update: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    mockManagerGlobal = { update: jest.fn() };
    mockManager = {
      create: jest.fn((_entidad: unknown, datos: object) => ({ ...datos })),
      save: jest.fn(),
      update: jest.fn(),
    };
    target = new BitacoraService({
      manager: mockManagerGlobal,
    } as unknown as DataSource);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('registrar', () => {
    it('debe guardar la acción de comunidad con el manager de la transacción sin tocar la red', async () => {
      await target.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 1,
          accion: 'aprobar_solicitud_acceso',
          entidad: 'solicitudes_acceso',
          idEntidad: 80,
          detalle: { idUnidad: 12 },
        },
        mockManager as never,
      );

      expect(mockManager.create).toHaveBeenCalledWith(BitacoraAuditoria, {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: 3,
        idUsuario: 1,
        accion: 'aprobar_solicitud_acceso',
        entidad: 'solicitudes_acceso',
        idEntidad: 80,
        detalle: { idUnidad: 12 },
      });
      expect(mockManager.save).toHaveBeenCalledTimes(1);
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockManagerGlobal.update).not.toHaveBeenCalled();
    });

    it('debe guardar acciones de plataforma sin comunidad', async () => {
      await target.registrar(
        {
          ambito: AmbitoBitacora.PLATAFORMA,
          idUsuario: 1,
          accion: 'bloquear_usuario',
          entidad: 'usuarios',
          idEntidad: 7,
        },
        mockManager as never,
      );

      expect(mockManager.create).toHaveBeenCalledWith(BitacoraAuditoria, {
        ambito: AmbitoBitacora.PLATAFORMA,
        idRed: null,
        idUsuario: 1,
        accion: 'bloquear_usuario',
        entidad: 'usuarios',
        idEntidad: 7,
        detalle: null,
      });
    });

    it('debe propagar el error de guardado para que la transacción haga rollback', async () => {
      mockManager.save.mockRejectedValue(new Error('BD caída'));

      await expect(
        target.registrar(
          {
            ambito: AmbitoBitacora.COMUNIDAD,
            idRed: 3,
            idUsuario: 1,
            accion: 'x',
            entidad: 'y',
          },
          mockManager as never,
        ),
      ).rejects.toThrow('BD caída');
    });
  });

  describe('marcarActividad', () => {
    it('debe actualizar la última actividad fuera de la transacción', async () => {
      await target.marcarActividad(3);

      expect(mockManagerGlobal.update).toHaveBeenCalledWith(
        RedVecinal,
        { idRed: 3 },
        { ultimaActividad: AHORA },
      );
    });

    it('debe registrar el error sin lanzar cuando la actualización falla', async () => {
      mockManagerGlobal.update.mockRejectedValue(new Error('ER_LOCK_DEADLOCK'));
      const espiaError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(target.marcarActividad(3)).resolves.toBeUndefined();
      expect(espiaError).toHaveBeenCalledWith(
        'No se pudo actualizar la última actividad de la comunidad 3',
        expect.any(String),
      );
    });
  });
});

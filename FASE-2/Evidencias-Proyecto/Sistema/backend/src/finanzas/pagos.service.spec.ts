import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource, In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { AvisoPago, EstadoAviso } from './entities/aviso-pago.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from './entities/notificacion-enviada.entity';
import { PagosService } from './pagos.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('PagosService', () => {
  let target: PagosService;
  let mockManager: {
    find: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
    insert: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCorreosService: {
    destinatarios: jest.Mock;
    enviarEnSegundoPlano: jest.Mock;
  };
  let filas: CobroUnidad[];
  let avisos: AvisoPago[];
  let cobrosDeLaRed: number;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.TESORERO],
    modulos: [],
    idsUnidades: [],
  };

  const fila = (
    idCobroUnidad: number,
    estado = EstadoCobroUnidad.PENDIENTE,
    cambios: Partial<CobroUnidad> = {},
  ) =>
    ({
      idCobroUnidad,
      idCobro: 70,
      idUnidad: idCobroUnidad * 10,
      monto: 30000,
      estado,
      ...cambios,
    }) as CobroUnidad;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    filas = [fila(1), fila(2)];
    avisos = [
      {
        idAviso: 4,
        idCobroUnidad: 1,
        estado: EstadoAviso.PENDIENTE,
      } as AvisoPago,
    ];
    cobrosDeLaRed = 1;
    mockManager = {
      find: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === AvisoPago ? avisos : filas),
      ),
      count: jest.fn(() => Promise.resolve(cobrosDeLaRed)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      insert: jest.fn().mockResolvedValue({ identifiers: [] }),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    mockCorreosService = {
      destinatarios: jest.fn().mockResolvedValue([
        {
          idUsuario: 9,
          nombre: 'Rosa',
          correo: 'r@p.cl',
          idsUnidad: [10, 20],
        },
      ]),
      enviarEnSegundoPlano: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
        { provide: CorreosComunidadService, useValue: mockCorreosService },
      ],
    }).compile();

    target = module.get(PagosService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('marcarPagos', () => {
    it('debe bloquear las filas, verificar la comunidad, marcarlas y validar sus avisos pendientes', async () => {
      const resultado = await target.marcarPagos(red, 5, {
        idsCobroUnidad: [1, 2],
      });

      expect(mockManager.find).toHaveBeenCalledWith(CobroUnidad, {
        where: { idCobroUnidad: In([1, 2]) },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.count).toHaveBeenCalledWith(Cobro, {
        where: { idCobro: In([70]), idRed: 3 },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        CobroUnidad,
        { idCobroUnidad: In([1, 2]) },
        {
          estado: EstadoCobroUnidad.PAGADO,
          pagadoMarcadoEn: AHORA,
          pagadoMarcadoPor: 5,
        },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        AvisoPago,
        { idCobroUnidad: In([1, 2]), estado: EstadoAviso.PENDIENTE },
        { estado: EstadoAviso.VALIDADO, validadoPor: 5, validadoEn: AHORA },
      );
      expect(resultado).toEqual({ marcados: 2, avisosValidados: 1 });
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe rechazar cobros que ya no están pendientes', async () => {
      filas = [fila(1), fila(2, EstadoCobroUnidad.EXENTO)];

      await expect(
        target.marcarPagos(red, 5, { idsCobroUnidad: [1, 2] }),
      ).rejects.toThrow(ConflictException);

      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it.each([
      ['falta una fila', () => (filas = [fila(1)])],
      ['el cobro es de otra comunidad', () => (cobrosDeLaRed = 0)],
    ])('debe responder 404 cuando %s', async (_caso, preparar) => {
      preparar();

      await expect(
        target.marcarPagos(red, 5, { idsCobroUnidad: [1, 2] }),
      ).rejects.toThrow(new NotFoundException('Cobro de unidad no encontrado'));
    });
  });

  describe('anularPago', () => {
    it('debe devolver el cobro a pendiente y anular el aviso validado', async () => {
      filas = [fila(1, EstadoCobroUnidad.PAGADO)];

      await target.anularPago(red, 5, 1);

      expect(mockManager.update).toHaveBeenCalledWith(
        CobroUnidad,
        { idCobroUnidad: 1 },
        {
          estado: EstadoCobroUnidad.PENDIENTE,
          pagadoMarcadoEn: null,
          pagadoMarcadoPor: null,
        },
      );
      expect(mockManager.update).toHaveBeenCalledWith(
        AvisoPago,
        { idCobroUnidad: 1, estado: EstadoAviso.VALIDADO },
        {
          estado: EstadoAviso.RECHAZADO,
          motivoRechazo: 'Pago anulado desde el panel',
          validadoPor: 5,
          validadoEn: AHORA,
        },
      );
    });

    it('debe rechazar anular un cobro que no está pagado', async () => {
      filas = [fila(1)];

      await expect(target.anularPago(red, 5, 1)).rejects.toThrow(
        new ConflictException('Este cobro no está marcado como pagado'),
      );
    });
  });

  describe('rechazarAvisos', () => {
    it('debe rechazar los avisos pendientes con el motivo por defecto', async () => {
      filas = [fila(1)];

      await target.rechazarAvisos(red, 5, { idsAviso: [4] });

      expect(mockManager.update).toHaveBeenCalledWith(
        AvisoPago,
        { idAviso: In([4]) },
        {
          estado: EstadoAviso.RECHAZADO,
          motivoRechazo: 'La administración no encontró la transferencia',
          validadoPor: 5,
          validadoEn: AHORA,
        },
      );
    });

    it('debe rechazar avisos ya revisados', async () => {
      filas = [fila(1)];
      avisos = [{ ...avisos[0], estado: EstadoAviso.VALIDADO } as AvisoPago];

      await expect(
        target.rechazarAvisos(red, 5, { idsAviso: [4] }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe responder 404 por un aviso de otra comunidad', async () => {
      filas = [fila(1)];
      cobrosDeLaRed = 0;

      await expect(
        target.rechazarAvisos(red, 5, { idsAviso: [4] }),
      ).rejects.toThrow(new NotFoundException('Aviso no encontrado'));
    });
  });

  describe('enviarRecordatorio', () => {
    it('debe avisar a los residentes de las unidades atrasadas con su deuda', async () => {
      filas = [fila(1), fila(2)];

      const resultado = await target.enviarRecordatorio(red, 5);

      expect(mockCorreosService.destinatarios).toHaveBeenCalledWith(
        mockManager,
        3,
        [10, 20],
      );
      expect(mockManager.insert).toHaveBeenCalledWith(NotificacionEnviada, {
        idRed: 3,
        tipo: TipoNotificacion.RECORDATORIO_MOROSIDAD,
        asunto: 'Recordatorio de deuda pendiente',
        destinatarios: 1,
        enviadoPor: 5,
      });
      expect(mockCorreosService.enviarEnSegundoPlano).toHaveBeenCalledWith([
        expect.objectContaining({
          para: 'r@p.cl',
          texto: expect.stringMatching(/60\.000/),
        }),
      ]);
      expect(resultado).toEqual({ unidades: 2, destinatarios: 1 });
    });

    it('debe responder 409 cuando no hay deuda atrasada', async () => {
      filas = [];

      await expect(target.enviarRecordatorio(red, 5)).rejects.toThrow(
        new ConflictException('No hay unidades con deuda atrasada'),
      );

      expect(mockCorreosService.enviarEnSegundoPlano).not.toHaveBeenCalled();
    });
  });
});

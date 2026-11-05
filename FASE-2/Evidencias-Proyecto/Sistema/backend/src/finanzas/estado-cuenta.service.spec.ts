import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AvisoPago, EstadoAviso } from './entities/aviso-pago.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { EstadoExencion, Exencion } from './entities/exencion.entity';
import { NotificacionEnviada } from './entities/notificacion-enviada.entity';
import { EstadoCuentaService, EstadoPlano } from './estado-cuenta.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

const cobro = (idCobro: number, periodo: string, fechaVencimiento: string) =>
  ({
    idCobro,
    concepto: `Cobro ${idCobro}`,
    periodo,
    fechaVencimiento,
  }) as Cobro;
const OCTUBRE = cobro(1, '2026-10-01', '2026-10-10');
const NOVIEMBRE = cobro(2, '2026-11-01', '2026-11-10');

const fila = (
  idCobroUnidad: number,
  idUnidad: number,
  deCobro: Cobro,
  estado = EstadoCobroUnidad.PENDIENTE,
  avisos: AvisoPago[] = [],
) =>
  ({
    idCobroUnidad,
    idCobro: deCobro.idCobro,
    idUnidad,
    monto: 30000,
    estado,
    cobro: deCobro,
    avisos,
    pagadoMarcadoEn: null,
  }) as unknown as CobroUnidad;

describe('EstadoCuentaService', () => {
  let target: EstadoCuentaService;
  let mockCobrosUnidadRepository: { find: jest.Mock };
  let mockManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneByOrFail: jest.Mock;
    insert: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let unidades: Unidad[];
  let filas: CobroUnidad[];
  let exenciones: Exencion[];

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.RESIDENTE],
    modulos: [],
    idsUnidades: [10],
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    unidades = [10, 20, 30, 40].map(
      (idUnidad) =>
        ({ idUnidad, idRed: 3, numeroIdentificador: `${idUnidad}` }) as Unidad,
    );
    filas = [
      fila(1, 10, OCTUBRE),
      fila(2, 10, NOVIEMBRE),
      fila(3, 20, OCTUBRE, EstadoCobroUnidad.PAGADO),
      fila(4, 20, NOVIEMBRE, EstadoCobroUnidad.PAGADO),
      fila(5, 30, NOVIEMBRE),
    ];
    exenciones = [];
    mockCobrosUnidadRepository = {
      find: jest.fn(() => Promise.resolve(filas)),
    };
    mockManager = {
      find: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === CobroUnidad
            ? filas
            : entidad === Unidad
              ? unidades
              : entidad === Exencion
                ? exenciones
                : entidad === Usuario
                  ? [
                      {
                        idUsuario: 9,
                        nombre: 'Rosa',
                        primerApellido: 'Soto',
                        segundoApellido: null,
                      },
                    ]
                  : [],
        ),
      ),
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === Unidad ? unidades[0] : null),
      ),
      findOneByOrFail: jest.fn().mockResolvedValue({
        banco: 'Banco Estado',
        numeroCuenta: '123',
      } as RedVecinal),
      insert: jest.fn().mockResolvedValue({ identifiers: [] }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        EstadoCuentaService,
        {
          provide: getRepositoryToken(CobroUnidad),
          useValue: mockCobrosUnidadRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: mockManager,
            transaction: (trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
          },
        },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(EstadoCuentaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('estadoPanel', () => {
    it('debe calcular el estado de cada unidad para el plano', async () => {
      exenciones = [
        {
          estado: EstadoExencion.POR_APROBAR,
          cobroUnidad: { idUnidad: 30 },
        } as Exencion,
      ];

      const resultado = await target.estadoPanel(red);

      expect(resultado.unidades).toEqual([
        { idUnidad: 10, estado: EstadoPlano.MOROSO },
        { idUnidad: 20, estado: EstadoPlano.PAGADO },
        { idUnidad: 30, estado: EstadoPlano.EXENCION },
        { idUnidad: 40, estado: null },
      ]);
    });

    it('debe resumir el mes y listar a los morosos con su deuda vencida', async () => {
      const resultado = await target.estadoPanel(red);

      expect(resultado.periodo).toBe('2026-11-01');
      expect(resultado.resumen).toEqual(
        expect.objectContaining({
          totalUnidades: 4,
          alDia: 1,
          esperado: 90000,
          recaudado: 30000,
          deudaMorosa: 30000,
        }),
      );
      expect(resultado.morosos).toEqual([
        {
          idUnidad: 10,
          numeroIdentificador: '10',
          callePasaje: undefined,
          deudaAtrasada: 30000,
          pendienteNoVencido: 30000,
          total: 60000,
          cobrosAtrasados: 1,
        },
      ]);
    });

    it('debe leer solo cobros de la comunidad del contexto', async () => {
      await target.estadoPanel(red);

      expect(mockCobrosUnidadRepository.find).toHaveBeenCalledWith({
        where: { cobro: { idRed: 3 } },
        relations: { cobro: true },
      });
    });
  });

  describe('miCuenta', () => {
    it('debe devolver los datos para transferir y la cuenta de las unidades propias', async () => {
      filas = [fila(1, 10, OCTUBRE), fila(2, 10, NOVIEMBRE)];

      const resultado = await target.miCuenta(red);

      expect(resultado.datosTransferencia).toEqual(
        expect.objectContaining({ banco: 'Banco Estado', numeroCuenta: '123' }),
      );
      expect(resultado.unidades[0]).toEqual(
        expect.objectContaining({
          idUnidad: 10,
          deudaAtrasada: 30000,
          pendienteNoVencido: 30000,
          total: 60000,
        }),
      );
      expect(resultado.unidades[0].cobros.map((c) => c.atrasado)).toEqual([
        true,
        false,
      ]);
    });

    it('no debe consultar unidades cuando la persona no vive en la comunidad', async () => {
      const resultado = await target.miCuenta({ ...red, idsUnidades: [] });

      expect(resultado.unidades).toEqual([]);
    });
  });

  describe('detalleUnidad', () => {
    it('debe responder 404 por una unidad de otra comunidad', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(target.detalleUnidad(red, 99)).rejects.toThrow(
        new NotFoundException('Unidad no encontrada'),
      );
    });
  });

  describe('avisarTransferencia', () => {
    const aviso = { idUnidad: 10, monto: 50000, fechaPago: '2026-11-04' };

    it('debe repartir el monto del cobro más antiguo al más nuevo', async () => {
      filas = [fila(1, 10, OCTUBRE), fila(2, 10, NOVIEMBRE)];

      const resultado = await target.avisarTransferencia(red, 9, {
        ...aviso,
        observacion: 'Desde cuenta RUT',
      });

      expect(mockManager.insert).toHaveBeenCalledWith(AvisoPago, [
        {
          idCobroUnidad: 1,
          idUsuario: 9,
          monto: 30000,
          fechaPago: '2026-11-04',
          observacion: 'Desde cuenta RUT',
        },
        {
          idCobroUnidad: 2,
          idUsuario: 9,
          monto: 20000,
          fechaPago: '2026-11-04',
          observacion: 'Desde cuenta RUT',
        },
      ]);
      expect(resultado).toEqual({ avisos: 2 });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'avisar_transferencia' }),
        mockManager,
      );
    });

    it('debe dejar el excedente en el último cobro', async () => {
      filas = [fila(1, 10, OCTUBRE)];

      await target.avisarTransferencia(red, 9, aviso);

      expect(mockManager.insert).toHaveBeenCalledWith(AvisoPago, [
        expect.objectContaining({ idCobroUnidad: 1, monto: 50000 }),
      ]);
    });

    it('debe saltar los cobros que ya tienen un aviso pendiente', async () => {
      filas = [
        fila(1, 10, OCTUBRE, EstadoCobroUnidad.PENDIENTE, [
          { estado: EstadoAviso.PENDIENTE } as AvisoPago,
        ]),
        fila(2, 10, NOVIEMBRE),
      ];

      await target.avisarTransferencia(red, 9, aviso);

      expect(mockManager.insert).toHaveBeenCalledWith(AvisoPago, [
        expect.objectContaining({ idCobroUnidad: 2, monto: 50000 }),
      ]);
    });

    it('debe responder 409 cuando no queda nada por avisar', async () => {
      filas = [];

      await expect(target.avisarTransferencia(red, 9, aviso)).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe responder 404 por una unidad donde no vive', async () => {
      await expect(
        target.avisarTransferencia(red, 9, { ...aviso, idUnidad: 20 }),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
    });
  });

  it('debe usar el recordatorio más reciente', async () => {
    mockManager.findOne.mockImplementation((entidad: unknown) =>
      Promise.resolve(
        entidad === NotificacionEnviada
          ? { fechaCreacion: AHORA, destinatarios: 4 }
          : null,
      ),
    );

    const { ultimoRecordatorio } = await target.estadoPanel(red);

    expect(ultimoRecordatorio).toEqual({ fecha: AHORA, destinatarios: 4 });
  });
});

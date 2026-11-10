import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CobrosService } from './cobros.service';
import { CrearCobroDto } from './dto/finanzas.dto';
import { AvisoPago } from './entities/aviso-pago.entity';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { Exencion } from './entities/exencion.entity';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from './entities/notificacion-enviada.entity';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('CobrosService', () => {
  let target: CobrosService;
  let mockCobrosRepository: { find: jest.Mock; findOne: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    find: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    exists: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCorreosService: {
    destinatarios: jest.Mock;
    enviarEnSegundoPlano: jest.Mock;
  };
  let categoria: CategoriaGasto | null;
  let cobroEnBd: Cobro | null;
  let movimientos: {
    noPendientes: boolean;
    avisos: boolean;
    exenciones: boolean;
  };

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.TESORERO],
    modulos: [],
    idsUnidades: [],
  };

  const crearCobro = (cambios: Partial<Cobro> = {}): Cobro =>
    ({
      idCobro: 70,
      idRed: 3,
      idCategoria: 8,
      categoria: { idCategoria: 8, nombre: 'Gasto común' },
      concepto: 'Gasto común noviembre',
      descripcion: null,
      montoPorUnidad: 45000,
      periodo: '2026-11-01',
      fechaEmision: '2026-11-05',
      fechaVencimiento: '2026-11-10',
      extraordinario: false,
      unidades: [
        { monto: 45000, estado: EstadoCobroUnidad.PAGADO },
        { monto: 45000, estado: EstadoCobroUnidad.PENDIENTE },
        { monto: 45000, estado: EstadoCobroUnidad.EXENTO },
      ],
      ...cambios,
    }) as Cobro;

  const dto = {
    idCategoria: 8,
    concepto: 'Gasto común noviembre',
    montoPorUnidad: 45000,
    fechaVencimiento: '2026-11-10',
  } as CrearCobroDto;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    categoria = { idCategoria: 8, activa: true } as CategoriaGasto;
    cobroEnBd = crearCobro();
    movimientos = { noPendientes: false, avisos: false, exenciones: false };
    mockCobrosRepository = {
      find: jest.fn().mockResolvedValue([crearCobro()]),
      findOne: jest.fn(() => Promise.resolve(crearCobro())),
    };
    mockManager = {
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === CategoriaGasto ? categoria : cobroEnBd),
      ),
      find: jest
        .fn()
        .mockResolvedValue([{ idUnidad: 1 }, { idUnidad: 2 }, { idUnidad: 3 }]),
      insert: jest.fn((entidad: unknown) =>
        Promise.resolve({
          identifiers: entidad === Cobro ? [{ idCobro: 70 }] : [],
        }),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
      exists: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === CobroUnidad
            ? movimientos.noPendientes
            : entidad === AvisoPago
              ? movimientos.avisos
              : entidad === Exencion
                ? movimientos.exenciones
                : false,
        ),
      ),
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
      destinatarios: jest
        .fn()
        .mockResolvedValue([
          { idUsuario: 9, nombre: 'Rosa', correo: 'r@p.cl', idsUnidad: [1] },
        ]),
      enviarEnSegundoPlano: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CobrosService,
        { provide: getRepositoryToken(Cobro), useValue: mockCobrosRepository },
        { provide: DataSource, useValue: mockDataSource },
        { provide: BitacoraService, useValue: mockBitacoraService },
        { provide: CorreosComunidadService, useValue: mockCorreosService },
      ],
    }).compile();

    target = module.get(CobrosService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  const insertado = (entidad: unknown) =>
    mockManager.insert.mock.calls.find(([e]) => e === entidad)?.[1];

  describe('listar', () => {
    it('debe resumir cada cobro con lo esperado y lo recaudado, sin contar exentas', async () => {
      const [cobro] = await target.listar(red);

      expect(cobro.totales).toEqual({
        unidades: 3,
        pagadas: 1,
        exentas: 1,
        pendientes: 1,
        esperado: 90000,
        recaudado: 45000,
      });
      expect(cobro.categoria).toEqual({
        idCategoria: 8,
        nombre: 'Gasto común',
      });
    });
  });

  describe('crear', () => {
    it('debe crear el cobro del mes con fecha de hoy y una fila por unidad', async () => {
      await target.crear(red, 5, dto);

      expect(insertado(Cobro)).toEqual({
        idRed: 3,
        idCategoria: 8,
        concepto: 'Gasto común noviembre',
        descripcion: null,
        montoPorUnidad: 45000,
        periodo: '2026-11-01',
        fechaEmision: '2026-11-05',
        fechaVencimiento: '2026-11-10',
        extraordinario: false,
        creadoPor: 5,
      });
      expect(insertado(CobroUnidad)).toEqual([
        { idCobro: 70, idUnidad: 1, monto: 45000 },
        { idCobro: 70, idUnidad: 2, monto: 45000 },
        { idCobro: 70, idUnidad: 3, monto: 45000 },
      ]);
    });

    it('debe registrar el correo enviado y la bitácora en la transacción, y enviar después', async () => {
      const resultado = await target.crear(red, 5, dto);

      expect(insertado(NotificacionEnviada)).toEqual({
        idRed: 3,
        tipo: TipoNotificacion.NUEVO_COBRO,
        asunto: 'Gasto común noviembre',
        idCobro: 70,
        destinatarios: 1,
        enviadoPor: 5,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'crear_cobro',
          entidad: 'cobros',
          idEntidad: 70,
        }),
        mockManager,
      );
      expect(mockCorreosService.enviarEnSegundoPlano).toHaveBeenCalledWith([
        expect.objectContaining({
          para: 'r@p.cl',
          asunto: 'Nuevo cobro: Gasto común noviembre',
          texto: expect.stringContaining('10-11-2026'),
        }),
      ]);
      expect(resultado.correos).toBe(1);
    });

    it.each([
      ['no existe', null],
      ['está desactivada', { idCategoria: 8, activa: false } as CategoriaGasto],
    ])(
      'debe rechazar una categoría que %s',
      async (_caso, valor: CategoriaGasto | null) => {
        categoria = valor;

        await expect(target.crear(red, 5, dto)).rejects.toThrow(
          new BadRequestException('La categoría no existe o está desactivada'),
        );

        expect(insertado(Cobro)).toBeUndefined();
      },
    );

    it('debe rechazar crear un cobro en una comunidad sin unidades', async () => {
      mockManager.find.mockResolvedValue([]);

      await expect(target.crear(red, 5, dto)).rejects.toThrow(
        new BadRequestException(
          'La comunidad todavía no tiene unidades para cobrar',
        ),
      );
    });

    it('debe buscar la categoría solo en la comunidad del contexto', async () => {
      await target.crear(red, 5, dto);

      expect(mockManager.findOne).toHaveBeenCalledWith(CategoriaGasto, {
        where: { idCategoria: 8, idRed: 3 },
      });
      expect(mockManager.find).toHaveBeenCalledWith(
        Unidad,
        expect.objectContaining({ where: { idRed: 3 } }),
      );
    });
  });

  describe('editar', () => {
    it('debe cambiar el concepto y el vencimiento aunque haya movimientos', async () => {
      movimientos.avisos = true;

      await target.editar(red, 5, 70, {
        concepto: 'Gasto común nov.',
        fechaVencimiento: '2026-11-15',
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        Cobro,
        { idCobro: 70, idRed: 3 },
        { concepto: 'Gasto común nov.', fechaVencimiento: '2026-11-15' },
      );
    });

    it('debe cambiar el monto del cobro y de cada unidad cuando no hay movimientos', async () => {
      await target.editar(red, 5, 70, { montoPorUnidad: 50000 });

      expect(mockManager.update).toHaveBeenCalledWith(
        CobroUnidad,
        { idCobro: 70 },
        { monto: 50000 },
      );
    });

    it.each([['noPendientes'], ['avisos'], ['exenciones']] as const)(
      'no debe cambiar el monto si hay %s',
      async (tipo) => {
        movimientos[tipo] = true;

        await expect(
          target.editar(red, 5, 70, { montoPorUnidad: 50000 }),
        ).rejects.toThrow(ConflictException);

        expect(mockManager.update).not.toHaveBeenCalled();
      },
    );

    it('no debe aceptar un vencimiento anterior a la emisión', async () => {
      await expect(
        target.editar(red, 5, 70, { fechaVencimiento: '2026-11-01' }),
      ).rejects.toThrow(
        new BadRequestException(
          'El vencimiento no puede ser anterior a la emisión del cobro',
        ),
      );
    });

    it('no debe escribir ni registrar nada cuando no cambia nada', async () => {
      await target.editar(red, 5, 70, { concepto: 'Gasto común noviembre' });

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });

    it('debe responder 404 por un cobro de otra comunidad', async () => {
      cobroEnBd = null;

      await expect(
        target.editar(red, 5, 99, { concepto: 'X' }),
      ).rejects.toThrow(new NotFoundException('Cobro no encontrado'));
    });
  });

  describe('eliminar', () => {
    it('debe borrar el cobro y sus filas cuando no hay movimientos', async () => {
      await target.eliminar(red, 5, 70);

      expect(mockManager.softDelete).toHaveBeenCalledWith(CobroUnidad, {
        idCobro: 70,
      });
      expect(mockManager.softDelete).toHaveBeenCalledWith(Cobro, {
        idCobro: 70,
        idRed: 3,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'eliminar_cobro' }),
        mockManager,
      );
    });

    it('no debe borrar un cobro con pagos', async () => {
      movimientos.noPendientes = true;

      await expect(target.eliminar(red, 5, 70)).rejects.toThrow(
        new ConflictException(
          'No puedes eliminar el cobro: ya tiene pagos, avisos o exenciones',
        ),
      );

      expect(mockManager.softDelete).not.toHaveBeenCalled();
    });
  });
});

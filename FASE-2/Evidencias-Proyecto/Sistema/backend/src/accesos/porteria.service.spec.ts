import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  In,
  IsNull,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThan,
  Not,
} from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CategoriaAcceso, Invitacion } from './entities/invitacion.entity';
import {
  EstadoAutorizacion,
  MetodoAcceso,
  RegistroAcceso,
  ViaAutorizacion,
} from './entities/registro-acceso.entity';
import { Vehiculo } from './entities/vehiculo.entity';
import { Visitante } from './entities/visitante.entity';
import { PorteriaService } from './porteria.service';

const AHORA = new Date('2026-11-06T15:00:00Z');
const LIMITE = new Date('2026-11-06T14:30:00Z');
const ID_CONSERJE = 4;
const ID_ANA = 2;

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.CONSERJE],
  modulos: [],
  idsUnidades: [],
};

const crearInvitacion = (cambios: Partial<Invitacion> = {}) =>
  ({
    idInvitacion: 40,
    idRed: 3,
    idUnidad: 101,
    unidad: null,
    creadaPor: ID_ANA,
    nombreVisita: 'Daniela Pino',
    identificadorVisita: '12345678-5',
    patente: 'RTKD45',
    categoria: CategoriaAcceso.VISITA,
    codigo: 'EC-ABCD-2345',
    validaDesde: new Date('2026-11-06T14:00:00Z'),
    validaHasta: new Date('2026-11-06T18:00:00Z'),
    canceladaEn: null,
    ...cambios,
  }) as Invitacion;

const crearAcceso = (cambios: Partial<RegistroAcceso> = {}) =>
  ({
    idAcceso: 9,
    idRed: 3,
    idVisitante: 70,
    visitante: { nombre: 'Daniela', apellido: 'Pino' },
    idUnidad: 101,
    unidad: { idUnidad: 101, numeroIdentificador: '101', torre: 'A' },
    idInvitacion: 40,
    categoria: CategoriaAcceso.VISITA,
    patente: 'RTKD45',
    estadoAutorizacion: EstadoAutorizacion.APROBADO,
    autorizadoVia: ViaAutorizacion.INVITACION,
    autorizadoPor: ID_ANA,
    validadoPor: ID_CONSERJE,
    metodo: MetodoAcceso.QR,
    fechaCreacion: AHORA,
    fechaIngreso: AHORA,
    fechaSalida: null,
    ...cambios,
  }) as RegistroAcceso;

describe('PorteriaService', () => {
  let target: PorteriaService;
  let mockInvitacionesRepository: { find: jest.Mock };
  let mockAccesosRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    exists: jest.Mock;
  };
  let mockConsulta: Record<string, jest.Mock>;
  let mockManager: {
    createQueryBuilder: jest.Mock;
    findOneOrFail: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    exists: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    restore: jest.Mock;
  };
  let mockCuentas: { conAcceso: jest.Mock };
  let mockBitacora: { marcarActividad: jest.Mock };
  let invitacionEnBd: Invitacion | null;
  let accesoDeInvitacion: RegistroAcceso | null;
  let accesoPorId: RegistroAcceso | null;
  let vive: boolean;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    invitacionEnBd = crearInvitacion();
    accesoDeInvitacion = null;
    accesoPorId = crearAcceso();
    vive = true;
    mockInvitacionesRepository = { find: jest.fn().mockResolvedValue([]) };
    mockAccesosRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn((opciones: { where: { idInvitacion?: number } }) =>
        Promise.resolve(
          opciones.where.idInvitacion === undefined
            ? accesoPorId
            : accesoDeInvitacion,
        ),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      exists: jest.fn().mockResolvedValue(true),
    };
    mockConsulta = {};
    for (const paso of ['insert', 'into', 'values', 'orUpdate']) {
      mockConsulta[paso] = jest.fn(() => mockConsulta);
    }
    mockConsulta.execute = jest.fn().mockResolvedValue(undefined);
    mockManager = {
      createQueryBuilder: jest.fn(() => mockConsulta),
      findOneOrFail: jest.fn().mockResolvedValue({ idVisitante: 70 }),
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === Invitacion) return Promise.resolve(invitacionEnBd);
        if (entidad === RegistroAcceso)
          return Promise.resolve(accesoDeInvitacion);
        if (entidad === Unidad) return Promise.resolve({ idUnidad: 101 });
        return Promise.resolve(null);
      }),
      find: jest.fn().mockResolvedValue([]),
      exists: jest.fn(() => Promise.resolve(vive)),
      insert: jest.fn((entidad: unknown) =>
        Promise.resolve({
          identifiers: [
            entidad === Visitante ? { idVisitante: 70 } : { idAcceso: 9 },
          ],
        }),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue(undefined),
    };
    mockCuentas = {
      conAcceso: jest.fn((_m: unknown, _r: number, ids: number[]) =>
        Promise.resolve(new Set(ids)),
      ),
    };
    mockBitacora = { marcarActividad: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        PorteriaService,
        {
          provide: getRepositoryToken(Invitacion),
          useValue: mockInvitacionesRepository,
        },
        {
          provide: getRepositoryToken(RegistroAcceso),
          useValue: mockAccesosRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: mockManager,
            transaction: jest.fn((trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
            ),
          },
        },
        { provide: BitacoraService, useValue: mockBitacora },
        { provide: CuentasService, useValue: mockCuentas },
      ],
    }).compile();

    target = module.get(PorteriaService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('resumen', () => {
    it('debe separar las esperadas de las que ya ingresaron y no mostrar códigos', async () => {
      mockInvitacionesRepository.find.mockResolvedValue([
        crearInvitacion(),
        crearInvitacion({ idInvitacion: 41 }),
      ]);
      mockManager.find.mockImplementation((entidad: unknown) =>
        Promise.resolve(
          entidad === RegistroAcceso ? [crearAcceso({ idInvitacion: 41 })] : [],
        ),
      );

      const { esperadas } = await target.resumen(RED);

      expect(mockInvitacionesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ idRed: 3, canceladaEn: IsNull() }),
        }),
      );
      expect(esperadas.map((i) => i.idInvitacion)).toEqual([40]);
      expect(esperadas[0]).not.toHaveProperty('codigo');
    });

    it('debe pedir los que están adentro y los pendientes de la comunidad', async () => {
      await target.resumen(RED);

      expect(mockAccesosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idRed: 3,
            estadoAutorizacion: EstadoAutorizacion.APROBADO,
            fechaSalida: IsNull(),
          },
        }),
      );
      expect(mockAccesosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            idRed: 3,
            estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
            fechaCreacion: MoreThan(LIMITE),
          },
        }),
      );
    });

    it('debe mostrar a la garita el RUT de la visita esperada para verificarla, pero no el código', async () => {
      mockInvitacionesRepository.find.mockResolvedValue([crearInvitacion()]);

      const { esperadas } = await target.resumen(RED);

      expect(esperadas[0].rut).toBe('12345678-5');
      expect(esperadas[0]).not.toHaveProperty('codigo');
    });
  });

  describe('monitor', () => {
    it('debe paginar los accesos resueltos y las llegadas que expiraron sin respuesta', async () => {
      mockAccesosRepository.find.mockResolvedValue([
        crearAcceso({ idAcceso: 9 }),
        crearAcceso({ idAcceso: 8 }),
      ]);

      const resultado = await target.monitor(RED, { antesDe: 10, limite: 1 });

      expect(mockAccesosRepository.find).toHaveBeenCalledWith({
        where: [
          {
            idRed: 3,
            idAcceso: LessThan(10),
            estadoAutorizacion: Not(EstadoAutorizacion.PENDIENTE),
          },
          {
            idRed: 3,
            idAcceso: LessThan(10),
            estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
            fechaCreacion: LessThanOrEqual(LIMITE),
          },
        ],
        relations: { visitante: true, unidad: true },
        order: { idAcceso: 'DESC' },
        take: 2,
      });
      expect(resultado.accesos).toHaveLength(1);
      expect(resultado.siguiente).toBe(9);
    });

    it('debe terminar la paginación sin cursor y sin filtrar por id en la primera página', async () => {
      mockAccesosRepository.find.mockResolvedValue([crearAcceso()]);

      const resultado = await target.monitor(RED, {});

      expect(mockAccesosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            {
              idRed: 3,
              estadoAutorizacion: Not(EstadoAutorizacion.PENDIENTE),
            },
            {
              idRed: 3,
              estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
              fechaCreacion: LessThanOrEqual(LIMITE),
            },
          ],
          take: 51,
        }),
      );
      expect(resultado.siguiente).toBeNull();
    });
  });

  describe('validar', () => {
    it('debe buscar el código normalizado solo en la comunidad', async () => {
      const resultado = await target.validar(RED, { codigo: 'ec abcd 2345' });

      expect(mockManager.findOne).toHaveBeenCalledWith(Invitacion, {
        where: { codigo: 'EC-ABCD-2345', idRed: 3 },
        relations: { unidad: true },
      });
      expect(resultado.resultado).toBe('valido');
      expect(resultado.invitacion).not.toHaveProperty('codigo');
      expect(mockAccesosRepository.findOne).toHaveBeenCalledWith({
        where: { idInvitacion: 40 },
        withDeleted: true,
      });
    });

    it('debe dar el código por usado aunque su ingreso esté eliminado', async () => {
      accesoDeInvitacion = crearAcceso({ fechaSalida: AHORA });

      const resultado = await target.validar(RED, { codigo: 'EC-ABCD-2345' });

      expect(resultado.resultado).toBe('usado');
    });

    it('debe responder no_existe sin consultar con un código mal formado', async () => {
      const resultado = await target.validar(RED, { codigo: 'hola' });

      expect(resultado).toEqual({ resultado: 'no_existe', invitacion: null });
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('debe responder no_existe con un código de otra comunidad', async () => {
      invitacionEnBd = null;

      const resultado = await target.validar(RED, { codigo: 'EC-ABCD-2345' });

      expect(resultado).toEqual({ resultado: 'no_existe', invitacion: null });
    });

    it.each([
      [
        'sin residencia vigente',
        () => {
          vive = false;
        },
      ],
      [
        'sin acceso a la comunidad',
        () => {
          mockCuentas.conAcceso.mockResolvedValue(new Set());
        },
      ],
      [
        'sin autor',
        () => {
          invitacionEnBd = crearInvitacion({ creadaPor: null });
        },
      ],
    ])(
      'debe responder sin_invitante si quien invitó está %s',
      async (_c, preparar) => {
        preparar();

        const resultado = await target.validar(RED, { codigo: 'EC-ABCD-2345' });

        expect(resultado.resultado).toBe('sin_invitante');
      },
    );

    it('debe revisar la residencia vigente de quien invitó en esa vivienda', async () => {
      await target.validar(RED, { codigo: 'EC-ABCD-2345' });

      expect(mockManager.exists).toHaveBeenCalledWith(Residencia, {
        where: expect.objectContaining({ idUsuario: ID_ANA, idUnidad: 101 }),
      });
      expect(mockCuentas.conAcceso).toHaveBeenCalledWith(mockManager, 3, [
        ID_ANA,
      ]);
    });
  });

  describe('ingresoConCodigo', () => {
    it('debe registrar el ingreso aprobado por invitación, con el visitante y la invitación bloqueada', async () => {
      await target.ingresoConCodigo(RED, ID_CONSERJE, {
        codigo: 'EC-ABCD-2345',
      });

      expect(mockManager.findOne).toHaveBeenCalledWith(Invitacion, {
        where: { codigo: 'EC-ABCD-2345', idRed: 3 },
        relations: {},
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(RegistroAcceso, {
        where: { idInvitacion: 40 },
        withDeleted: true,
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Invitacion,
        { idInvitacion: 40 },
        { idVisitante: 70 },
      );
      expect(mockManager.insert).toHaveBeenCalledWith(RegistroAcceso, {
        idRed: 3,
        idVisitante: 70,
        idUnidad: 101,
        idInvitacion: 40,
        categoria: CategoriaAcceso.VISITA,
        patente: 'RTKD45',
        fechaIngreso: AHORA,
        estadoAutorizacion: EstadoAutorizacion.APROBADO,
        autorizadoVia: ViaAutorizacion.INVITACION,
        autorizadoPor: ID_ANA,
        validadoPor: ID_CONSERJE,
        metodo: MetodoAcceso.QR,
      });
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe responder 404 si el código no existe', async () => {
      invitacionEnBd = null;

      await expect(
        target.ingresoConCodigo(RED, ID_CONSERJE, { codigo: 'EC-ABCD-2345' }),
      ).rejects.toThrow(new NotFoundException('Código no encontrado'));
    });

    it.each([
      [
        'La visita ya está adentro',
        () => {
          accesoDeInvitacion = crearAcceso();
        },
      ],
      [
        'Este código ya se usó',
        () => {
          accesoDeInvitacion = crearAcceso({ fechaSalida: AHORA });
        },
      ],
      [
        'La invitación fue cancelada',
        () => {
          invitacionEnBd = crearInvitacion({ canceladaEn: AHORA });
        },
      ],
      [
        'La invitación está vencida',
        () => {
          invitacionEnBd = crearInvitacion({
            validaHasta: new Date('2026-11-06T14:30:00Z'),
          });
        },
      ],
      [
        'Todavía no es su hora: la invitación aún no comienza',
        () => {
          invitacionEnBd = crearInvitacion({
            validaDesde: new Date('2026-11-06T16:00:00Z'),
          });
        },
      ],
      [
        'Quien invitó ya no vive en la vivienda o no tiene acceso a la comunidad',
        () => {
          vive = false;
        },
      ],
    ])('debe responder 409 «%s» sin registrar', async (mensaje, preparar) => {
      preparar();

      await expect(
        target.ingresoConCodigo(RED, ID_CONSERJE, { codigo: 'EC-ABCD-2345' }),
      ).rejects.toThrow(new ConflictException(mensaje));
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('ingresoPorInvitacion', () => {
    it('debe buscar por id en la comunidad y registrar el método Manual', async () => {
      await target.ingresoPorInvitacion(RED, ID_CONSERJE, 40);

      expect(mockManager.findOne).toHaveBeenCalledWith(Invitacion, {
        where: { idInvitacion: 40, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(
        RegistroAcceso,
        expect.objectContaining({ metodo: MetodoAcceso.MANUAL }),
      );
    });

    it('debe responder 404 «Invitación no encontrada» con un id inexistente o de otra comunidad', async () => {
      invitacionEnBd = null;

      await expect(
        target.ingresoPorInvitacion(RED, ID_CONSERJE, 40),
      ).rejects.toThrow(new NotFoundException('Invitación no encontrada'));
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('registrarSalida', () => {
    it('debe marcar la salida con un UPDATE condicional', async () => {
      await target.registrarSalida(RED, 9);

      expect(mockAccesosRepository.update).toHaveBeenCalledWith(
        {
          idAcceso: 9,
          idRed: 3,
          estadoAutorizacion: EstadoAutorizacion.APROBADO,
          fechaSalida: IsNull(),
          fechaEliminacion: IsNull(),
        },
        { fechaSalida: AHORA },
      );
    });

    it('debe responder 404 si el ingreso no es de la comunidad', async () => {
      mockAccesosRepository.update.mockResolvedValue({ affected: 0 });
      mockAccesosRepository.exists.mockResolvedValue(false);

      await expect(target.registrarSalida(RED, 9)).rejects.toThrow(
        new NotFoundException('Ingreso no encontrado'),
      );
    });

    it('debe responder 409 si ya salió o no ingresó', async () => {
      mockAccesosRepository.update.mockResolvedValue({ affected: 0 });

      await expect(target.registrarSalida(RED, 9)).rejects.toThrow(
        new ConflictException(
          'La salida ya estaba registrada o la visita no ingresó',
        ),
      );
      expect(mockBitacora.marcarActividad).not.toHaveBeenCalled();
    });
  });

  describe('ingresoSinInvitacion', () => {
    const dto = {
      nombre: 'Rappi',
      categoria: CategoriaAcceso.DELIVERY,
      idUnidad: 101,
    };

    it('debe dejar la llegada pendiente del residente, registrada por el conserje', async () => {
      await target.ingresoSinInvitacion(RED, ID_CONSERJE, dto);

      expect(mockManager.findOne).toHaveBeenCalledWith(Unidad, {
        where: { idUnidad: 101, idRed: 3 },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(RegistroAcceso, {
        idRed: 3,
        idVisitante: 70,
        idUnidad: 101,
        idInvitacion: null,
        categoria: CategoriaAcceso.DELIVERY,
        patente: null,
        fechaIngreso: null,
        estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
        autorizadoVia: null,
        autorizadoPor: null,
        validadoPor: ID_CONSERJE,
        metodo: MetodoAcceso.MANUAL,
      });
    });

    it('debe responder 404 con una vivienda de otra comunidad', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        target.ingresoSinInvitacion(RED, ID_CONSERJE, dto),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('resolverPorTelefono', () => {
    it('debe aprobar por teléfono sin atribuir la decisión a un residente', async () => {
      await target.resolverPorTelefono(RED, ID_CONSERJE, 9, { aprobado: true });

      expect(mockAccesosRepository.update).toHaveBeenCalledWith(
        {
          idAcceso: 9,
          idRed: 3,
          estadoAutorizacion: EstadoAutorizacion.PENDIENTE,
          fechaCreacion: MoreThan(LIMITE),
          fechaEliminacion: IsNull(),
        },
        {
          estadoAutorizacion: EstadoAutorizacion.APROBADO,
          autorizadoVia: ViaAutorizacion.TELEFONO,
          autorizadoPor: null,
          validadoPor: ID_CONSERJE,
          fechaIngreso: AHORA,
        },
      );
    });

    it('debe rechazar sin hora de ingreso', async () => {
      await target.resolverPorTelefono(RED, ID_CONSERJE, 9, {
        aprobado: false,
      });

      expect(mockAccesosRepository.update).toHaveBeenCalledWith(
        expect.anything(),
        {
          estadoAutorizacion: EstadoAutorizacion.RECHAZADO,
          autorizadoVia: ViaAutorizacion.TELEFONO,
          autorizadoPor: null,
          validadoPor: ID_CONSERJE,
          fechaIngreso: null,
        },
      );
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
        accesoPorId = crearAcceso({ estadoAutorizacion });

        await expect(
          target.resolverPorTelefono(RED, ID_CONSERJE, 9, { aprobado: true }),
        ).rejects.toThrow(new ConflictException(mensaje));
        expect(mockBitacora.marcarActividad).not.toHaveBeenCalled();
      },
    );

    it('debe responder 404 con un ingreso de otra comunidad', async () => {
      mockAccesosRepository.update.mockResolvedValue({ affected: 0 });
      accesoPorId = null;

      await expect(
        target.resolverPorTelefono(RED, ID_CONSERJE, 9, { aprobado: true }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('buscar', () => {
    it('debe escapar los comodines de LIKE y filtrar por la comunidad', async () => {
      await target.buscar(RED, '%_');

      expect(mockManager.find).toHaveBeenCalledWith(Unidad, {
        select: { idUnidad: true },
        where: { idRed: 3, numeroIdentificador: Like('%\\%\\_%') },
        order: { idUnidad: 'ASC' },
        take: 8,
      });
    });

    it('debe encontrar un RUT escrito completo aunque se guarde con guion', async () => {
      await target.buscar(RED, '22.222.222-2');

      expect(mockManager.find).toHaveBeenCalledWith(
        Residencia,
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({
              usuario: { identificador: Like('%222222222%') },
            }),
            expect.objectContaining({
              usuario: { identificador: Like('%22222222-2%') },
            }),
          ]),
        }),
      );
    });

    it('debe buscar RUT y patente sin puntos, guiones ni espacios', async () => {
      await target.buscar(RED, 'rt-kd 45');

      expect(mockManager.find).toHaveBeenCalledWith(Vehiculo, {
        select: { idUnidad: true, idVehiculo: true, idUsuario: true },
        where: { patente: Like('%RTKD45%'), unidad: { idRed: 3 } },
        relations: { unidad: true },
        take: 8,
      });
    });

    it('debe devolver la ficha de la vivienda solo con residentes con acceso, sus vehículos y sin su RUT', async () => {
      mockManager.find.mockImplementation(
        (entidad: unknown, opciones: { select?: unknown }) => {
          if (entidad === Unidad && opciones.select) {
            return Promise.resolve([{ idUnidad: 101 }]);
          }
          if (entidad === Unidad) {
            return Promise.resolve([
              { idUnidad: 101, numeroIdentificador: '101', torre: 'A' },
            ]);
          }
          if (entidad === Residencia && !opciones.select) {
            return Promise.resolve([
              {
                idUsuario: ID_ANA,
                idUnidad: 101,
                tipo: 'Propietario',
                usuario: {
                  nombre: 'Ana',
                  primerApellido: 'Rojas',
                  identificador: '22222222-2',
                  telefono: '+56911112222',
                },
              },
              {
                idUsuario: 5,
                idUnidad: 101,
                tipo: 'Arrendatario',
                usuario: { nombre: 'Sofía', primerApellido: 'Paz' },
              },
            ]);
          }
          if (entidad === Vehiculo && !opciones.select) {
            return Promise.resolve([
              {
                idUnidad: 101,
                idUsuario: ID_ANA,
                patente: 'RTKD45',
                marca: null,
                modelo: 'Yaris',
                color: null,
                estacionamiento: 'E-12',
              },
              {
                idUnidad: 101,
                idUsuario: 99,
                patente: 'XXYY11',
                marca: 'Kia',
                modelo: 'Rio',
                color: 'Rojo',
                estacionamiento: 'E-13',
              },
            ]);
          }
          return Promise.resolve([]);
        },
      );
      mockCuentas.conAcceso.mockResolvedValue(new Set([ID_ANA]));

      const resultado = await target.buscar(RED, '101');

      expect(resultado).toEqual({
        resultados: [
          {
            unidad: { idUnidad: 101, numeroIdentificador: '101', torre: 'A' },
            residentes: [
              {
                idUsuario: ID_ANA,
                nombre: 'Ana Rojas',
                tipoResidencia: 'Propietario',
                telefono: '+56911112222',
              },
            ],
            vehiculos: [
              {
                patente: 'RTKD45',
                marca: null,
                modelo: 'Yaris',
                color: null,
                estacionamiento: 'E-12',
              },
            ],
          },
        ],
      });
      expect(mockManager.find).toHaveBeenCalledWith(Unidad, {
        where: { idRed: 3, idUnidad: In([101]) },
        order: { orden: 'ASC', idUnidad: 'ASC' },
      });
    });

    it('no debe llevar a la vivienda de alguien que ya no vive ahí por la patente de su vehículo', async () => {
      mockManager.find.mockImplementation(
        (entidad: unknown, opciones: { select?: unknown }) => {
          if (entidad === Vehiculo && opciones.select) {
            return Promise.resolve([
              { idVehiculo: 1, idUnidad: 101, idUsuario: 99 },
            ]);
          }
          return Promise.resolve([]);
        },
      );

      const resultado = await target.buscar(RED, 'XXYY11');

      expect(mockManager.find).toHaveBeenCalledWith(Residencia, {
        select: { idUnidad: true, idUsuario: true, idResidencia: true },
        where: expect.objectContaining({
          idUsuario: In([99]),
          idUnidad: In([101]),
        }),
      });
      expect(resultado).toEqual({ resultados: [] });
    });

    it('no debe pedir fichas si nada coincide', async () => {
      const resultado = await target.buscar(RED, 'zz');

      expect(resultado).toEqual({ resultados: [] });
      expect(mockCuentas.conAcceso).not.toHaveBeenCalled();
    });
  });
});

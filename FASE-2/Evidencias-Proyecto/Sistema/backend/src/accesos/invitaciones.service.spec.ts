import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, IsNull, MoreThan, MoreThanOrEqual } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { CodigoError } from '../common/errores/codigo-error.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CrearInvitacionDto } from './dto/accesos.dto';
import { CategoriaAcceso, Invitacion } from './entities/invitacion.entity';
import { RegistroAcceso } from './entities/registro-acceso.entity';
import { InvitacionesService } from './invitaciones.service';

const AHORA = new Date('2026-11-06T15:00:00Z');
const ID_ANA = 2;
const ID_LUIS = 5;
const DESDE_101 = new Date('2026-01-10T03:00:00Z');
const DESDE_102 = new Date('2026-03-01T03:00:00Z');

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.RESIDENTE],
  modulos: [CodigoModulo.INVITACIONES_QR, CodigoModulo.CONSERJERIA],
  idsUnidades: [101, 102],
};

const VISIBLES = [
  { idRed: 3, idUnidad: 101, fechaCreacion: MoreThanOrEqual(DESDE_101) },
  { idRed: 3, idUnidad: 102, fechaCreacion: MoreThanOrEqual(DESDE_102) },
];

const crearInvitacion = (cambios: Partial<Invitacion> = {}) =>
  ({
    idInvitacion: 40,
    idRed: 3,
    idUnidad: 101,
    unidad: { idUnidad: 101, numeroIdentificador: '101', torre: 'A' },
    creadaPor: ID_ANA,
    nombreVisita: 'Daniela Pino',
    identificadorVisita: '12345678-5',
    patente: 'RTKD45',
    categoria: CategoriaAcceso.VISITA,
    codigo: 'EC-ABCD-2345',
    validaDesde: new Date('2026-11-06T15:00:00Z'),
    validaHasta: new Date('2026-11-06T19:00:00Z'),
    canceladaEn: null,
    ...cambios,
  }) as Invitacion;

const dto = (
  cambios: Partial<CrearInvitacionDto> = {},
): CrearInvitacionDto => ({
  nombre: 'Daniela Pino',
  rut: '12345678-5',
  categoria: CategoriaAcceso.VISITA,
  patente: 'RTKD45',
  validaDesde: '2026-11-06T15:00:00Z',
  validaHasta: '2026-11-06T19:00:00Z',
  ...cambios,
});

describe('InvitacionesService', () => {
  let target: InvitacionesService;
  let mockInvitacionesRepository: { find: jest.Mock; findOne: jest.Mock };
  let mockManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    exists: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockManagerLectura: { find: jest.Mock };
  let mockBitacora: { marcarActividad: jest.Mock };
  let invitacionEnBd: Invitacion | null;
  let unidadEnBd: Partial<Unidad> | null;
  let residencias: Partial<Residencia>[];
  let accesos: Partial<RegistroAcceso>[];
  let vigentes: Partial<Invitacion>[];
  let codigoOcupado: boolean;

  const buscar = (entidad: unknown) => {
    if (entidad === Residencia) {
      return Promise.resolve(residencias);
    }
    if (entidad === RegistroAcceso) {
      return Promise.resolve(accesos);
    }
    if (entidad === Invitacion) {
      return Promise.resolve(vigentes);
    }
    return Promise.resolve([
      { idUsuario: ID_ANA, nombre: 'Ana', primerApellido: 'Rojas' },
    ]);
  };

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    invitacionEnBd = crearInvitacion();
    unidadEnBd = { idUnidad: 101 };
    residencias = [
      { idUnidad: 101, desde: '2026-01-10' },
      { idUnidad: 102, desde: '2026-03-01' },
    ];
    accesos = [];
    vigentes = [];
    codigoOcupado = false;
    mockInvitacionesRepository = {
      find: jest.fn().mockResolvedValue([crearInvitacion()]),
      findOne: jest.fn().mockResolvedValue(crearInvitacion()),
    };
    mockManager = {
      find: jest.fn(buscar),
      findOne: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === Invitacion ? invitacionEnBd : unidadEnBd),
      ),
      exists: jest.fn(() => Promise.resolve(codigoOcupado)),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idInvitacion: 40 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockManagerLectura = { find: jest.fn(buscar) };
    mockBitacora = { marcarActividad: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        InvitacionesService,
        {
          provide: getRepositoryToken(Invitacion),
          useValue: mockInvitacionesRepository,
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

    target = module.get(InvitacionesService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe traer solo lo creado desde que la persona vive en cada vivienda, con código y RUT para quien invitó', async () => {
      const resultado = await target.listar(RED, ID_ANA);

      expect(mockManagerLectura.find).toHaveBeenCalledWith(Residencia, {
        select: { idUnidad: true, desde: true },
        where: {
          idUsuario: ID_ANA,
          idUnidad: In([101, 102]),
          ...condicionVigente(),
        },
      });
      expect(mockInvitacionesRepository.find).toHaveBeenCalledWith({
        where: VISIBLES,
        relations: { unidad: true },
        order: { validaDesde: 'DESC', idInvitacion: 'DESC' },
        take: 100,
      });
      expect(resultado).toEqual({
        invitaciones: [
          {
            idInvitacion: 40,
            codigo: 'EC-ABCD-2345',
            nombreVisita: 'Daniela Pino',
            rut: '12345678-5',
            categoria: CategoriaAcceso.VISITA,
            patente: 'RTKD45',
            validaDesde: new Date('2026-11-06T15:00:00Z'),
            validaHasta: new Date('2026-11-06T19:00:00Z'),
            canceladaEn: null,
            estado: 'Esperada',
            idAcceso: null,
            ingresoEn: null,
            salidaEn: null,
            unidad: { idUnidad: 101, numeroIdentificador: '101', torre: 'A' },
            invitadaPor: { idUsuario: ID_ANA, nombre: 'Ana Rojas' },
          },
        ],
      });
    });

    it('no debe mostrar el código ni el RUT de la visita a otro integrante del hogar', async () => {
      const { invitaciones } = await target.listar(RED, ID_LUIS);

      expect(invitaciones[0]).not.toHaveProperty('codigo');
      expect(invitaciones[0].rut).toBeNull();
      expect(invitaciones[0].nombreVisita).toBe('Daniela Pino');
    });

    it('debe usar el inicio más antiguo si la persona tiene dos residencias vigentes en la misma vivienda', async () => {
      residencias = [
        { idUnidad: 101, desde: '2026-03-01' },
        { idUnidad: 101, desde: '2026-01-10' },
      ];

      await target.listar(RED, ID_ANA);

      expect(mockInvitacionesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: [VISIBLES[0]] }),
      );
    });

    it('debe responder vacío sin consultar a quien no vive en la comunidad', async () => {
      const resultado = await target.listar(
        { ...RED, idsUnidades: [] },
        ID_ANA,
      );

      expect(resultado).toEqual({ invitaciones: [] });
      expect(mockManagerLectura.find).not.toHaveBeenCalled();
      expect(mockInvitacionesRepository.find).not.toHaveBeenCalled();
    });

    it('debe responder vacío si no tiene residencia vigente en esas viviendas', async () => {
      residencias = [];

      const resultado = await target.listar(RED, ID_ANA);

      expect(resultado).toEqual({ invitaciones: [] });
      expect(mockInvitacionesRepository.find).not.toHaveBeenCalled();
    });

    it('debe marcar Adentro la invitación con ingreso registrado, aunque el ingreso esté eliminado', async () => {
      accesos = [
        {
          idAcceso: 9,
          idInvitacion: 40,
          fechaIngreso: AHORA,
          fechaSalida: null,
        },
      ];

      const { invitaciones } = await target.listar(RED, ID_ANA);

      expect(mockManagerLectura.find).toHaveBeenCalledWith(RegistroAcceso, {
        where: { idInvitacion: In([40]) },
        withDeleted: true,
      });
      expect(invitaciones[0]).toEqual(
        expect.objectContaining({
          estado: 'Adentro',
          idAcceso: 9,
          ingresoEn: AHORA,
        }),
      );
    });
  });

  describe('detalle', () => {
    it('debe responder 404 con una invitación de otra vivienda, comunidad o anterior a la residencia', async () => {
      mockInvitacionesRepository.findOne.mockResolvedValue(null);

      await expect(target.detalle(RED, ID_ANA, 40)).rejects.toThrow(
        new NotFoundException('Invitación no encontrada'),
      );
      expect(mockInvitacionesRepository.findOne).toHaveBeenCalledWith({
        where: VISIBLES.map((v) => ({ idInvitacion: 40, ...v })),
        relations: { unidad: true },
      });
    });

    it('debe responder 404 sin consultar a quien no vive en la comunidad', async () => {
      await expect(
        target.detalle({ ...RED, idsUnidades: [] }, ID_ANA, 40),
      ).rejects.toThrow(NotFoundException);
      expect(mockInvitacionesRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('crear', () => {
    it('debe guardar la invitación con un código nuevo y la vivienda bloqueada', async () => {
      await target.crear(RED, ID_ANA, dto());

      expect(mockManager.findOne).toHaveBeenCalledWith(Unidad, {
        where: { idUnidad: 101, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.find).toHaveBeenCalledWith(Invitacion, {
        select: { idInvitacion: true },
        where: {
          idRed: 3,
          idUnidad: 101,
          canceladaEn: IsNull(),
          validaHasta: MoreThan(AHORA),
        },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(Invitacion, {
        idRed: 3,
        idUnidad: 101,
        creadaPor: ID_ANA,
        nombreVisita: 'Daniela Pino',
        identificadorVisita: '12345678-5',
        patente: 'RTKD45',
        categoria: CategoriaAcceso.VISITA,
        codigo: expect.stringMatching(
          /^EC-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/,
        ),
        validaDesde: new Date('2026-11-06T15:00:00Z'),
        validaHasta: new Date('2026-11-06T19:00:00Z'),
      });
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe guardar el instante exacto cuando la hora llega con desfase de Chile', async () => {
      await target.crear(
        RED,
        ID_ANA,
        dto({
          validaDesde: '2026-11-06T12:00:00-03:00',
          validaHasta: '2026-11-06T16:00:00-03:00',
        }),
      );

      expect(mockManager.insert).toHaveBeenCalledWith(
        Invitacion,
        expect.objectContaining({
          validaDesde: new Date('2026-11-06T15:00:00Z'),
          validaHasta: new Date('2026-11-06T19:00:00Z'),
        }),
      );
    });

    it('debe responder 404 si la vivienda ya no existe al bloquearla', async () => {
      unidadEnBd = null;

      await expect(target.crear(RED, ID_ANA, dto())).rejects.toThrow(
        new NotFoundException('Unidad no encontrada'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe guardar null en RUT y patente cuando no llegan', async () => {
      await target.crear(
        RED,
        ID_ANA,
        dto({ rut: undefined, patente: undefined }),
      );

      expect(mockManager.insert).toHaveBeenCalledWith(
        Invitacion,
        expect.objectContaining({ identificadorVisita: null, patente: null }),
      );
    });

    it('debe buscar otro código si el generado ya existe', async () => {
      mockManager.exists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      await target.crear(RED, ID_ANA, dto());

      expect(mockManager.exists).toHaveBeenCalledTimes(2);
      expect(mockManager.exists).toHaveBeenCalledWith(Invitacion, {
        where: { codigo: expect.any(String) },
        withDeleted: true,
      });
    });

    it('debe responder 500 si no encuentra un código libre, porque es una falla del generador', async () => {
      codigoOcupado = true;

      await expect(target.crear(RED, ID_ANA, dto())).rejects.toThrow(
        new InternalServerErrorException(
          'No pudimos generar un código de invitación',
        ),
      );
      expect(mockManager.exists).toHaveBeenCalledTimes(5);
    });

    it('debe responder 403 si la persona no vive en la comunidad', async () => {
      await expect(
        target.crear({ ...RED, idsUnidades: [] }, ID_ANA, dto()),
      ).rejects.toThrow(
        new ForbiddenException(
          'Solo quienes viven en la comunidad pueden invitar visitas',
        ),
      );
    });

    it('debe responder 403 MODULO_INACTIVO si la comunidad no tiene conserjería', async () => {
      const error = await target
        .crear(
          { ...RED, modulos: [CodigoModulo.INVITACIONES_QR] },
          ID_ANA,
          dto(),
        )
        .catch((e: ForbiddenException) => e);

      expect(error).toBeInstanceOf(ForbiddenException);
      expect((error as ForbiddenException).getResponse()).toEqual(
        expect.objectContaining({ codigo: CodigoError.MODULO_INACTIVO }),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe responder 404 con una vivienda ajena', async () => {
      await expect(
        target.crear(RED, ID_ANA, dto({ idUnidad: 999 })),
      ).rejects.toThrow(new NotFoundException('Unidad no encontrada'));
    });

    it.each([
      [
        { validaHasta: '2026-11-06T15:00:00Z' },
        'validaHasta',
        'La hora de término debe ser posterior a la de inicio',
      ],
      [
        {
          validaDesde: '2026-11-06T10:00:00Z',
          validaHasta: '2026-11-06T14:59:00Z',
        },
        'validaHasta',
        'La invitación debe terminar en el futuro',
      ],
      [
        { validaHasta: '2026-11-07T15:00:01Z' },
        'validaHasta',
        'Una invitación puede durar como máximo 24 horas',
      ],
      [
        {
          validaDesde: '2027-01-05T15:00:01Z',
          validaHasta: '2027-01-05T17:00:00Z',
        },
        'validaDesde',
        'Solo puedes invitar con hasta 60 días de anticipación',
      ],
    ])('con %j debe responder 400 en %s', async (cambios, campo, mensaje) => {
      const error = await target
        .crear(RED, ID_ANA, dto(cambios))
        .catch((e: BadRequestException) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: mensaje,
        campos: { [campo]: mensaje },
      });
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe aceptar exactamente 24 horas y 60 días', async () => {
      await target.crear(
        RED,
        ID_ANA,
        dto({
          validaDesde: '2027-01-05T15:00:00Z',
          validaHasta: '2027-01-06T15:00:00Z',
        }),
      );

      expect(mockManager.insert).toHaveBeenCalled();
    });

    it('debe limitar las invitaciones por usar de cada vivienda', async () => {
      vigentes = Array.from({ length: 30 }, (_, i) => ({
        idInvitacion: i + 1,
      }));

      await expect(target.crear(RED, ID_ANA, dto())).rejects.toThrow(
        new ConflictException(
          'Tu vivienda puede tener hasta 30 invitaciones por usar. Cancela alguna para crear otra',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('no debe contar para el límite las invitaciones que ya se usaron', async () => {
      vigentes = Array.from({ length: 30 }, (_, i) => ({
        idInvitacion: i + 1,
      }));
      accesos = [{ idAcceso: 9, idInvitacion: 1 }];

      await target.crear(RED, ID_ANA, dto());

      expect(mockManager.insert).toHaveBeenCalled();
    });
  });

  describe('cancelar', () => {
    it('debe marcar la cancelación con la invitación visible bloqueada', async () => {
      await target.cancelar(RED, ID_ANA, 40);

      expect(mockManager.findOne).toHaveBeenCalledWith(Invitacion, {
        where: VISIBLES.map((v) => ({ idInvitacion: 40, ...v })),
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.find).toHaveBeenCalledWith(RegistroAcceso, {
        where: { idInvitacion: In([40]) },
        withDeleted: true,
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Invitacion,
        { idInvitacion: 40 },
        { canceladaEn: AHORA },
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe responder 404 con una invitación ajena o anterior a la residencia', async () => {
      invitacionEnBd = null;

      await expect(target.cancelar(RED, ID_ANA, 40)).rejects.toThrow(
        new NotFoundException('Invitación no encontrada'),
      );
    });

    it('debe responder 404 sin consultar a quien no vive en la comunidad', async () => {
      await expect(
        target.cancelar({ ...RED, idsUnidades: [] }, ID_ANA, 40),
      ).rejects.toThrow(NotFoundException);
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it.each([
      [
        'ya cancelada',
        () => {
          invitacionEnBd = crearInvitacion({ canceladaEn: AHORA });
        },
        'La invitación ya estaba cancelada',
      ],
      [
        'con ingreso',
        () => {
          accesos = [{ idAcceso: 9, idInvitacion: 40 }];
        },
        'La visita ya ingresó: la invitación no se puede cancelar',
      ],
      [
        'vencida',
        () => {
          invitacionEnBd = crearInvitacion({ validaHasta: AHORA });
        },
        'La invitación ya venció',
      ],
    ])(
      'no debe cancelar una invitación %s',
      async (_caso, preparar, mensaje) => {
        preparar();

        await expect(target.cancelar(RED, ID_ANA, 40)).rejects.toThrow(
          new ConflictException(mensaje),
        );
        expect(mockManager.update).not.toHaveBeenCalled();
      },
    );
  });
});

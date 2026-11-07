import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RetencionAcceso } from './entities/retencion-acceso.entity';
import {
  RetencionAccesosService,
  SQL_ANONIMIZAR_ACCESOS,
  SQL_ANONIMIZAR_INVITACIONES,
  SQL_ANONIMIZAR_VISITANTES,
} from './retencion-accesos.service';

const AHORA = new Date('2026-11-06T15:00:00Z');
const LIMITE = new Date('2025-11-06T03:00:00Z');
const ID_ADMIN = 1;

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.ADMINISTRADOR],
  modulos: [],
  idsUnidades: [],
};

const crearRetencion = (cambios: Partial<RetencionAcceso> = {}) =>
  ({
    idRetencion: 6,
    idRed: 3,
    desde: new Date('2026-10-01T03:00:00Z'),
    hasta: new Date('2026-10-16T02:59:59Z'),
    motivo: 'Robo de bicicleta en estacionamientos',
    creadaPor: ID_ADMIN,
    liberadaEn: null,
    liberadaPor: null,
    fechaCreacion: AHORA,
    ...cambios,
  }) as RetencionAcceso;

const DTO = {
  desde: '2026-10-01',
  hasta: '2026-10-15',
  motivo: 'Robo de bicicleta en estacionamientos',
};

describe('RetencionAccesosService', () => {
  let target: RetencionAccesosService;
  let mockRetencionesRepository: { find: jest.Mock; findOne: jest.Mock };
  let mockManager: {
    insert: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    query: jest.Mock;
  };
  let mockBitacora: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let retencionEnBd: RetencionAcceso | null;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    retencionEnBd = crearRetencion();
    mockRetencionesRepository = {
      find: jest.fn().mockResolvedValue([crearRetencion()]),
      findOne: jest.fn(() => Promise.resolve(crearRetencion())),
    };
    mockManager = {
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idRetencion: 6 }] }),
      findOne: jest.fn(() => Promise.resolve(retencionEnBd)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      query: jest.fn().mockResolvedValue({ affectedRows: 0 }),
    };
    mockBitacora = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        RetencionAccesosService,
        {
          provide: getRepositoryToken(RetencionAcceso),
          useValue: mockRetencionesRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: {
              find: jest.fn().mockResolvedValue([
                {
                  idUsuario: ID_ADMIN,
                  nombre: 'Marta',
                  primerApellido: 'Díaz',
                },
              ]),
            },
            transaction: jest.fn((trabajo: (m: unknown) => unknown) =>
              trabajo(mockManager),
            ),
          },
        },
        { provide: BitacoraService, useValue: mockBitacora },
      ],
    }).compile();

    target = module.get(RetencionAccesosService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe traer las retenciones de la comunidad con el plazo de conservación', async () => {
      const resultado = await target.listar(RED);

      expect(mockRetencionesRepository.find).toHaveBeenCalledWith({
        where: { idRed: 3 },
        order: { idRetencion: 'DESC' },
        take: 100,
      });
      expect(resultado).toEqual({
        conservacionMeses: 12,
        retenciones: [
          {
            idRetencion: 6,
            desde: '2026-10-01',
            hasta: '2026-10-15',
            motivo: 'Robo de bicicleta en estacionamientos',
            activa: true,
            creadaEn: AHORA,
            creadaPor: { idUsuario: ID_ADMIN, nombre: 'Marta Díaz' },
            liberadaEn: null,
            liberadaPor: null,
          },
        ],
      });
    });
  });

  describe('crear', () => {
    it('debe guardar el rango completo de días de Chile y registrarlo en la bitácora', async () => {
      await target.crear(RED, ID_ADMIN, DTO);

      expect(mockManager.insert).toHaveBeenCalledWith(RetencionAcceso, {
        idRed: 3,
        desde: new Date('2026-10-01T03:00:00Z'),
        hasta: new Date('2026-10-16T02:59:59Z'),
        motivo: 'Robo de bicicleta en estacionamientos',
        creadaPor: ID_ADMIN,
      });
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: ID_ADMIN,
          accion: 'retener_registros_acceso',
          entidad: 'accesos_retenciones',
          idEntidad: 6,
          detalle: { desde: '2026-10-01', hasta: '2026-10-15' },
        },
        mockManager,
      );
      expect(mockBitacora.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('no debe copiar el motivo a la bitácora, porque puede traer datos personales', async () => {
      await target.crear(RED, ID_ADMIN, DTO);

      const [registro] = mockBitacora.registrar.mock.calls[0] as [
        { detalle: object },
      ];
      expect(registro.detalle).not.toHaveProperty('motivo');
    });

    it('debe aceptar exactamente 31 días', async () => {
      await target.crear(RED, ID_ADMIN, {
        ...DTO,
        desde: '2026-09-01',
        hasta: '2026-10-01',
      });

      expect(mockManager.insert).toHaveBeenCalled();
    });

    it.each([
      [
        { desde: '2026-10-15', hasta: '2026-10-01' },
        'La fecha de término debe ser igual o posterior a la de inicio',
      ],
      [
        { desde: '2026-09-01', hasta: '2026-10-02' },
        'Una retención puede cubrir como máximo 31 días',
      ],
    ])('con %j debe responder 400 en hasta', async (fechas, mensaje) => {
      const error = await target
        .crear(RED, ID_ADMIN, { ...DTO, ...fechas })
        .catch((e: BadRequestException) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: mensaje,
        campos: { hasta: mensaje },
      });
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe responder 409 si los registros de ese rango ya se anonimizaron', async () => {
      await expect(
        target.crear(RED, ID_ADMIN, {
          ...DTO,
          desde: '2025-10-01',
          hasta: '2025-10-15',
        }),
      ).rejects.toThrow(
        new ConflictException(
          'Esos registros ya superaron los 12 meses de conservación y fueron anonimizados',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('liberar', () => {
    it('debe liberar la retención bloqueada y registrarlo en la bitácora', async () => {
      await target.liberar(RED, ID_ADMIN, 6);

      expect(mockManager.findOne).toHaveBeenCalledWith(RetencionAcceso, {
        where: { idRetencion: 6, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        RetencionAcceso,
        { idRetencion: 6, liberadaEn: IsNull() },
        { liberadaEn: AHORA, liberadaPor: ID_ADMIN },
      );
      expect(mockBitacora.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'liberar_retencion_acceso',
          idEntidad: 6,
          detalle: { desde: '2026-10-01', hasta: '2026-10-15' },
        }),
        mockManager,
      );
    });

    it('debe responder 404 con una retención de otra comunidad', async () => {
      retencionEnBd = null;

      await expect(target.liberar(RED, ID_ADMIN, 6)).rejects.toThrow(
        new NotFoundException('Retención no encontrada'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe responder 409 si ya estaba liberada', async () => {
      retencionEnBd = crearRetencion({ liberadaEn: AHORA });

      await expect(target.liberar(RED, ID_ADMIN, 6)).rejects.toThrow(
        new ConflictException('La retención ya estaba liberada'),
      );
      expect(mockBitacora.registrar).not.toHaveBeenCalled();
    });
  });

  describe('anonimizarVencidos', () => {
    it('debe anonimizar accesos e invitaciones de hace más de 12 meses y luego a los visitantes que quedaron sin uso', async () => {
      mockManager.query
        .mockResolvedValueOnce({ affectedRows: 4 })
        .mockResolvedValueOnce({ affectedRows: 2 })
        .mockResolvedValueOnce({ affectedRows: 1 });

      const resultado = await target.anonimizarVencidos(AHORA);

      expect(mockManager.query.mock.calls).toEqual([
        [SQL_ANONIMIZAR_ACCESOS, [LIMITE]],
        [
          SQL_ANONIMIZAR_INVITACIONES,
          ['Visita anonimizada', LIMITE, 'Visita anonimizada'],
        ],
        [
          SQL_ANONIMIZAR_VISITANTES,
          ['Visita anonimizada', LIMITE, 'Visita anonimizada'],
        ],
      ]);
      expect(resultado).toEqual({
        limite: LIMITE,
        accesos: 4,
        invitaciones: 2,
        visitantes: 1,
      });
    });

    it('debe respetar las retenciones activas de cada comunidad', () => {
      for (const sql of [SQL_ANONIMIZAR_ACCESOS, SQL_ANONIMIZAR_INVITACIONES]) {
        expect(sql).toContain('NOT EXISTS');
        expect(sql).toContain('FROM accesos_retenciones r');
        expect(sql).toContain('r.liberada_en IS NULL');
        expect(sql).toContain('r.fecha_eliminacion IS NULL');
      }
      expect(SQL_ANONIMIZAR_ACCESOS).toContain('r.id_red = a.id_red');
      expect(SQL_ANONIMIZAR_INVITACIONES).toContain('r.id_red = i.id_red');
    });

    it('debe quitar la identidad de la visita y la patente, conservando fecha, vivienda y categoría', () => {
      expect(SQL_ANONIMIZAR_ACCESOS).toContain(
        'SET a.id_visitante = NULL, a.patente = NULL',
      );
      expect(SQL_ANONIMIZAR_INVITACIONES).toContain(
        'i.identificador_visita = NULL, i.patente = NULL, i.id_visitante = NULL',
      );
    });

    it('debe anonimizar sin borrar filas, y solo a visitantes que ya no tienen accesos ni invitaciones', () => {
      for (const sql of [
        SQL_ANONIMIZAR_ACCESOS,
        SQL_ANONIMIZAR_INVITACIONES,
        SQL_ANONIMIZAR_VISITANTES,
      ]) {
        expect(sql).not.toMatch(/\bDELETE\b/i);
      }
      expect(SQL_ANONIMIZAR_VISITANTES).toContain(
        "SET v.rut = NULL, v.nombre = ?, v.apellido = ''",
      );
      expect(SQL_ANONIMIZAR_VISITANTES).toContain(
        'NOT EXISTS (SELECT 1 FROM registro_accesos a WHERE a.id_visitante = v.id_visitante)',
      );
      expect(SQL_ANONIMIZAR_VISITANTES).toContain(
        'NOT EXISTS (SELECT 1 FROM invitaciones i WHERE i.id_visitante = v.id_visitante)',
      );
    });

    it('debe responder ceros si el driver no informa filas afectadas', async () => {
      mockManager.query.mockResolvedValue(undefined);

      const resultado = await target.anonimizarVencidos(AHORA);

      expect(resultado).toEqual(
        expect.objectContaining({ accesos: 0, invitaciones: 0, visitantes: 0 }),
      );
    });
  });
});

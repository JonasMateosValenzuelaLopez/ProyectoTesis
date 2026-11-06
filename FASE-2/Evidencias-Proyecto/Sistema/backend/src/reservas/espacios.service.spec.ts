import { BadRequestException, NotFoundException } from '@nestjs/common';
import { In, IsNull, MoreThan } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { CancelacionesService } from './cancelaciones.service';
import { EspacioDto } from './dto/reservas.dto';
import { EspacioComun } from './entities/espacio-comun.entity';
import { ReservaBloque } from './entities/reserva-bloque.entity';
import { ESTADOS_ACTIVOS, Reserva } from './entities/reserva.entity';
import { EspaciosService } from './espacios.service';

const AHORA = new Date('2026-11-05T13:00:00.000Z');

describe('EspaciosService', () => {
  let target: EspaciosService;
  let mockManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    restore: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCancelacionesService: { cancelar: jest.Mock; enviar: jest.Mock };
  let espaciosEnBd: EspacioComun[];
  let bloquesEnBd: ReservaBloque[];
  let reservasFuturas: Reserva[];

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.ADMINISTRADOR],
    modulos: [],
    idsUnidades: [],
  };

  const crearEspacio = (cambios: Partial<EspacioComun> = {}) =>
    ({
      idEspacio: 2,
      idRed: 3,
      nombre: 'Quincho',
      descripcion: null,
      capacidad: 20,
      estado: true,
      ...cambios,
    }) as EspacioComun;

  const crearBloque = (cambios: Partial<ReservaBloque> = {}) =>
    ({
      idBloque: 9,
      idEspacio: 2,
      horaInicio: '12:00',
      horaFin: '17:00',
      fechaEliminacion: null,
      ...cambios,
    }) as ReservaBloque;

  const quincho = (cambios: Partial<EspacioDto> = {}): EspacioDto => ({
    idEspacio: 2,
    nombre: 'Quincho',
    capacidad: 20,
    bloques: [{ horaInicio: '12:00', horaFin: '17:00' }],
    ...cambios,
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    espaciosEnBd = [crearEspacio()];
    bloquesEnBd = [crearBloque()];
    reservasFuturas = [];
    mockManager = {
      find: jest.fn((entidad: unknown) => {
        if (entidad === EspacioComun) {
          return Promise.resolve(espaciosEnBd);
        }
        if (entidad === ReservaBloque) {
          return Promise.resolve(bloquesEnBd);
        }
        return Promise.resolve(entidad === Reserva ? reservasFuturas : []);
      }),
      findOne: jest.fn().mockResolvedValue({ idRed: 3 }),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idEspacio: 5 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      restore: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    mockCancelacionesService = {
      cancelar: jest.fn((_m, _r, reservas: Reserva[]) =>
        Promise.resolve({
          correos: reservas.map(() => ({ para: 'rosa@x.cl' })),
          sinAviso: 0,
        }),
      ),
      enviar: jest.fn(),
    };
    target = new EspaciosService(
      {
        manager: mockManager,
        transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
          trabajo(mockManager),
        ),
      } as never,
      mockBitacoraService as unknown as BitacoraService,
      mockCancelacionesService as unknown as CancelacionesService,
    );
  });

  const consultaReservas = () =>
    (
      mockManager.find.mock.calls.find(([entidad]) => entidad === Reserva) as [
        unknown,
        { where: object[]; lock: object },
      ]
    )[1];

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe devolver los espacios activos de la comunidad con sus horarios', async () => {
      const resultado = await target.listar(red);

      expect(mockManager.find).toHaveBeenCalledWith(EspacioComun, {
        where: { idRed: 3, estado: true },
        order: { idEspacio: 'ASC' },
      });
      expect(resultado).toEqual([
        {
          idEspacio: 2,
          nombre: 'Quincho',
          descripcion: null,
          capacidad: 20,
          bloques: [{ idBloque: 9, horaInicio: '12:00', horaFin: '17:00' }],
        },
      ]);
    });

    it('no debe buscar horarios cuando no hay espacios', async () => {
      espaciosEnBd = [];

      expect(await target.listar(red)).toEqual([]);
      expect(mockManager.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('guardar', () => {
    it('no debe escribir ni registrar cuando no cambia nada', async () => {
      const resultado = await target.guardar(red, 1, { espacios: [quincho()] });

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
      expect(resultado.reservasCanceladas).toBe(0);
    });

    it('debe crear un espacio nuevo con sus horarios y registrarlo en bitácora', async () => {
      espaciosEnBd = [];
      bloquesEnBd = [];

      await target.guardar(red, 1, {
        espacios: [quincho({ idEspacio: undefined, nombre: 'Sala multiuso' })],
      });

      expect(mockManager.insert).toHaveBeenCalledWith(EspacioComun, {
        nombre: 'Sala multiuso',
        descripcion: null,
        capacidad: 20,
        estado: true,
        idRed: 3,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(ReservaBloque, {
        idEspacio: 5,
        horaInicio: '12:00',
        horaFin: '17:00',
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 1,
          accion: 'guardar_espacios',
          entidad: 'espacios_comunes',
          idEntidad: null,
          detalle: {
            creados: ['Sala multiuso'],
            editados: [],
            dadosDeBaja: [],
            reservasCanceladas: 0,
            reservasSinAviso: 0,
          },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe reactivar un espacio dado de baja con el mismo nombre en vez de crear otro', async () => {
      espaciosEnBd = [crearEspacio({ estado: false })];

      await target.guardar(red, 1, {
        espacios: [quincho({ idEspacio: undefined, nombre: 'QUINCHÓ' })],
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        EspacioComun,
        { idEspacio: 2 },
        { nombre: 'QUINCHÓ', descripcion: null, capacidad: 20, estado: true },
      );
      expect(mockManager.insert).not.toHaveBeenCalledWith(
        EspacioComun,
        expect.anything(),
      );
    });

    it('debe informar cuántas reservas canceladas quedaron sin nadie a quien avisar', async () => {
      reservasFuturas = [{ idReserva: 7 } as Reserva];
      mockCancelacionesService.cancelar.mockResolvedValue({
        correos: [],
        sinAviso: 1,
      });

      const resultado = await target.guardar(red, 1, { espacios: [] });

      expect(resultado.reservasCanceladas).toBe(1);
      expect(resultado.reservasSinAviso).toBe(1);
      expect(mockCancelacionesService.enviar).toHaveBeenCalledWith([]);
    });

    it('debe dar de baja el espacio quitado y cancelar sus reservas futuras con aviso', async () => {
      reservasFuturas = [{ idReserva: 7 } as Reserva];

      const resultado = await target.guardar(red, 1, { espacios: [] });

      expect(mockManager.update).toHaveBeenCalledWith(
        EspacioComun,
        { idEspacio: 2 },
        { estado: false },
      );
      expect(mockCancelacionesService.cancelar).toHaveBeenCalledWith(
        mockManager,
        3,
        reservasFuturas,
        expect.any(Function),
        'El espacio dejó de estar disponible',
      );
      expect(mockCancelacionesService.enviar).toHaveBeenCalledWith([
        { para: 'rosa@x.cl' },
      ]);
      expect(resultado.reservasCanceladas).toBe(1);
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: {
            creados: [],
            editados: [],
            dadosDeBaja: ['Quincho'],
            reservasCanceladas: 1,
            reservasSinAviso: 0,
          },
        }),
        mockManager,
      );
    });

    it('debe cancelar al dar de baja las reservas de hoy que aún no terminan ni se entregaron', async () => {
      await target.guardar(red, 1, { espacios: [] });

      expect(consultaReservas()).toEqual({
        where: [
          {
            idEspacio: 2,
            estadoReserva: In(ESTADOS_ACTIVOS),
            entregadoEn: IsNull(),
            fechaReserva: MoreThan('2026-11-05'),
          },
          {
            idEspacio: 2,
            estadoReserva: In(ESTADOS_ACTIVOS),
            entregadoEn: IsNull(),
            fechaReserva: '2026-11-05',
            horaFin: MoreThan('10:00'),
          },
        ],
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('debe cancelar con aviso las reservas de un horario cuyo término cambia', async () => {
      reservasFuturas = [{ idReserva: 7 } as Reserva];

      const resultado = await target.guardar(red, 1, {
        espacios: [
          quincho({ bloques: [{ horaInicio: '12:00', horaFin: '15:00' }] }),
        ],
      });

      expect(mockManager.update).toHaveBeenCalledWith(
        ReservaBloque,
        { idBloque: 9 },
        { horaFin: '15:00' },
      );
      expect(consultaReservas().where[0]).toEqual(
        expect.objectContaining({ horaInicio: In(['12:00']) }),
      );
      expect(mockCancelacionesService.cancelar).toHaveBeenCalledWith(
        mockManager,
        3,
        reservasFuturas,
        expect.any(Function),
        'El horario reservado cambió o dejó de estar disponible',
      );
      expect(resultado.reservasCanceladas).toBe(1);
    });

    it('debe registrar como editado un espacio al que solo le cambia la capacidad', async () => {
      await target.guardar(red, 1, { espacios: [quincho({ capacidad: 30 })] });

      expect(mockManager.update).toHaveBeenCalledWith(
        EspacioComun,
        { idEspacio: 2 },
        { nombre: 'Quincho', descripcion: null, capacidad: 30, estado: true },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: expect.objectContaining({ editados: ['Quincho'] }),
        }),
        mockManager,
      );
    });

    it('debe rechazar renombrar un espacio con el nombre de uno dado de baja', async () => {
      espaciosEnBd = [
        crearEspacio(),
        crearEspacio({ idEspacio: 4, nombre: 'Gimnasio', estado: false }),
      ];

      await expect(
        target.guardar(red, 1, { espacios: [quincho({ nombre: 'gimnasio' })] }),
      ).rejects.toThrow(
        new BadRequestException(
          'Ya hubo un espacio llamado gimnasio: agrégalo como espacio nuevo para recuperarlo o usa otro nombre',
        ),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe rechazar usar el nombre de un espacio que se quita en el mismo guardado', async () => {
      espaciosEnBd = [
        crearEspacio(),
        crearEspacio({ idEspacio: 4, nombre: 'Sala' }),
      ];

      await expect(
        target.guardar(red, 1, {
          espacios: [quincho({ idEspacio: 4 })],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe intercambiar los nombres de dos espacios pasando por un nombre temporal', async () => {
      espaciosEnBd = [
        crearEspacio(),
        crearEspacio({ idEspacio: 4, nombre: 'Sala' }),
      ];

      await target.guardar(red, 1, {
        espacios: [
          quincho({ nombre: 'Sala' }),
          quincho({ idEspacio: 4, nombre: 'Quincho' }),
        ],
      });

      const nombres = mockManager.update.mock.calls
        .filter(([entidad]) => entidad === EspacioComun)
        .map(([, id, campos]: [unknown, object, { nombre: string }]) => [
          id,
          campos.nombre,
        ]);
      expect(nombres).toEqual([
        [{ idEspacio: 2 }, '#2'],
        [{ idEspacio: 4 }, '#4'],
        [{ idEspacio: 2 }, 'Sala'],
        [{ idEspacio: 4 }, 'Quincho'],
      ]);
    });

    it('debe liberar el nombre antiguo antes de crear un espacio que lo usa', async () => {
      await target.guardar(red, 1, {
        espacios: [
          quincho({ idEspacio: undefined }),
          quincho({ nombre: 'Terraza' }),
        ],
      });

      const orden = (llamada: jest.Mock, indice: number) =>
        llamada.mock.invocationCallOrder[indice];
      const temporal = mockManager.update.mock.calls.findIndex(
        ([entidad, , campos]: [unknown, object, { nombre?: string }]) =>
          entidad === EspacioComun && campos.nombre === '#2',
      );
      const alta = mockManager.insert.mock.calls.findIndex(
        ([entidad]) => entidad === EspacioComun,
      );
      expect(temporal).toBeGreaterThanOrEqual(0);
      expect(orden(mockManager.update, temporal)).toBeLessThan(
        orden(mockManager.insert, alta),
      );
    });

    it('debe aceptar horarios contiguos', async () => {
      await expect(
        target.guardar(red, 1, {
          espacios: [
            quincho({
              bloques: [
                { horaInicio: '12:00', horaFin: '17:00' },
                { horaInicio: '17:00', horaFin: '20:00' },
              ],
            }),
          ],
        }),
      ).resolves.toBeDefined();
    });

    it('debe borrar con borrado lógico el horario quitado y cancelar solo sus reservas futuras', async () => {
      bloquesEnBd = [
        crearBloque(),
        crearBloque({ idBloque: 10, horaInicio: '18:00', horaFin: '23:00' }),
      ];
      reservasFuturas = [{ idReserva: 7 } as Reserva];

      await target.guardar(red, 1, { espacios: [quincho()] });

      expect(mockManager.softDelete).toHaveBeenCalledWith(ReservaBloque, {
        idBloque: In([10]),
      });
      expect(consultaReservas().where).toEqual([
        {
          idEspacio: 2,
          estadoReserva: In(ESTADOS_ACTIVOS),
          entregadoEn: IsNull(),
          horaInicio: In(['18:00']),
          fechaReserva: MoreThan('2026-11-05'),
        },
        {
          idEspacio: 2,
          estadoReserva: In(ESTADOS_ACTIVOS),
          entregadoEn: IsNull(),
          horaInicio: In(['18:00']),
          fechaReserva: '2026-11-05',
          horaFin: MoreThan('10:00'),
        },
      ]);
      expect(mockCancelacionesService.cancelar).toHaveBeenCalledWith(
        mockManager,
        3,
        reservasFuturas,
        expect.any(Function),
        'El horario reservado cambió o dejó de estar disponible',
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: expect.objectContaining({ editados: ['Quincho'] }),
        }),
        mockManager,
      );
    });

    it('debe restaurar un horario borrado que se vuelve a agregar y actualizar su término', async () => {
      bloquesEnBd = [
        crearBloque({ horaFin: '16:00', fechaEliminacion: AHORA }),
      ];

      await target.guardar(red, 1, { espacios: [quincho()] });

      expect(mockManager.restore).toHaveBeenCalledWith(ReservaBloque, {
        idBloque: 9,
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        ReservaBloque,
        { idBloque: 9 },
        { horaFin: '17:00' },
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe responder 404 por un espacio que no es de la comunidad', async () => {
      await expect(
        target.guardar(red, 1, { espacios: [quincho({ idEspacio: 99 })] }),
      ).rejects.toThrow(new NotFoundException('Espacio no encontrado'));
      expect(mockManager.find).toHaveBeenCalledWith(EspacioComun, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it.each([
      [
        'nombres repetidos sin importar tildes ni mayúsculas',
        [quincho(), quincho({ idEspacio: undefined, nombre: 'quinchó' })],
        'No repitas espacios comunes',
      ],
      [
        'el mismo espacio dos veces',
        [quincho(), quincho({ nombre: 'Sala' })],
        'Un espacio aparece dos veces',
      ],
      [
        'un horario que termina cuando empieza',
        [quincho({ bloques: [{ horaInicio: '12:00', horaFin: '12:00' }] })],
        'Quincho: cada horario debe terminar después de empezar',
      ],
      [
        'un horario que termina antes de empezar',
        [quincho({ bloques: [{ horaInicio: '17:00', horaFin: '12:00' }] })],
        'Quincho: cada horario debe terminar después de empezar',
      ],
      [
        'horarios que se cruzan',
        [
          quincho({
            bloques: [
              { horaInicio: '12:00', horaFin: '17:00' },
              { horaInicio: '16:00', horaFin: '18:00' },
            ],
          }),
        ],
        'Quincho: los horarios no pueden cruzarse',
      ],
    ])('debe rechazar %s', async (_caso, espacios, mensaje) => {
      await expect(target.guardar(red, 1, { espacios })).rejects.toThrow(
        new BadRequestException(mensaje),
      );
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });
  });
});

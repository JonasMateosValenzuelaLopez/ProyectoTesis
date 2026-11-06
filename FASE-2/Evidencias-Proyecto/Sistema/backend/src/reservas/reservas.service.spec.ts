import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { In, IsNull, LessThan, MoreThanOrEqual, Not } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CancelacionesService } from './cancelaciones.service';
import { CrearReservaDto } from './dto/reservas.dto';
import { EspacioComun } from './entities/espacio-comun.entity';
import { ReservaBloque } from './entities/reserva-bloque.entity';
import {
  ESTADOS_ACTIVOS,
  EstadoReserva,
  Reserva,
} from './entities/reserva.entity';
import { ReservasService } from './reservas.service';

const AHORA = new Date('2026-11-05T13:00:00.000Z');
const HOY = '2026-11-05';
const MANANA = '2026-11-06';

describe('ReservasService', () => {
  let target: ReservasService;
  let mockManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    findOneOrFail: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCancelacionesService: { cancelar: jest.Mock; enviar: jest.Mock };
  let espacio: EspacioComun | null;
  let bloque: ReservaBloque | null;
  let reservaEnBd: Reserva | null;
  let reservasDelDia: Reserva[];
  let enUso: Reserva | null;

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.RESIDENTE],
    modulos: [],
    idsUnidades: [40],
  };

  const crearEspacio = (cambios: Partial<EspacioComun> = {}) =>
    ({
      idEspacio: 2,
      idRed: 3,
      nombre: 'Quincho',
      capacidad: 20,
      estado: true,
      ...cambios,
    }) as EspacioComun;

  const crearReserva = (cambios: Partial<Reserva> = {}) =>
    ({
      idReserva: 7,
      idRed: 3,
      idEspacio: 2,
      idUsuario: 11,
      idUnidad: 40,
      fechaReserva: '2026-11-08',
      horaInicio: '12:00',
      horaFin: '17:00',
      invitados: 5,
      estadoReserva: EstadoReserva.APROBADA,
      motivoCancelacion: null,
      entregadoEn: null,
      recibidoEn: null,
      observacionesRecepcion: null,
      fechaSolicitud: AHORA,
      espacio: crearEspacio(),
      unidad: {
        idUnidad: 40,
        numeroIdentificador: '10',
        torre: null,
        callePasaje: 'Pasaje A',
      },
      ...cambios,
    }) as Reserva;

  const dto = (cambios: Partial<CrearReservaDto> = {}) =>
    ({
      idEspacio: 2,
      idUnidad: 40,
      fecha: MANANA,
      horaInicio: '12:00',
      invitados: 5,
      ...cambios,
    }) as CrearReservaDto;

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    espacio = crearEspacio();
    bloque = {
      idBloque: 9,
      idEspacio: 2,
      horaInicio: '12:00',
      horaFin: '17:00',
    } as ReservaBloque;
    reservaEnBd = crearReserva();
    reservasDelDia = [];
    enUso = null;
    mockManager = {
      find: jest.fn((entidad: unknown) => {
        if (entidad === Usuario) {
          return Promise.resolve([
            { idUsuario: 11, nombre: 'Rosa', primerApellido: 'Uno' },
          ]);
        }
        if (entidad === ReservaBloque) {
          return Promise.resolve(bloque ? [bloque] : []);
        }
        if (entidad === EspacioComun) {
          return Promise.resolve(espacio ? [espacio] : []);
        }
        return Promise.resolve(reservasDelDia);
      }),
      findOne: jest.fn((entidad: unknown, opciones: { where: object }) => {
        if (entidad === EspacioComun) {
          return Promise.resolve(espacio);
        }
        if (entidad === ReservaBloque) {
          return Promise.resolve(bloque);
        }
        return Promise.resolve(
          'entregadoEn' in opciones.where ? enUso : reservaEnBd,
        );
      }),
      findOneOrFail: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === EspacioComun ? crearEspacio() : reservaEnBd,
        ),
      ),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idReserva: 7 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    mockCancelacionesService = {
      cancelar: jest.fn().mockResolvedValue({
        correos: [{ para: 'rosa@x.cl' }],
        sinAviso: 0,
      }),
      enviar: jest.fn(),
    };
    target = new ReservasService(
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

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('disponibilidad', () => {
    it('debe marcar los bloques reservados, pasados y libres sin datos de quien reservó', async () => {
      bloque = {
        idBloque: 9,
        idEspacio: 2,
        horaInicio: '09:00',
        horaFin: '10:00',
      } as ReservaBloque;
      mockManager.find.mockImplementation((entidad: unknown) =>
        Promise.resolve(
          entidad === ReservaBloque
            ? [
                bloque,
                { idBloque: 10, horaInicio: '12:00', horaFin: '17:00' },
                { idBloque: 11, horaInicio: '18:00', horaFin: '22:00' },
              ]
            : [crearReserva({ fechaReserva: HOY })],
        ),
      );

      const resultado = await target.disponibilidad(red, {
        idEspacio: 2,
        fecha: HOY,
      });

      expect(resultado).toEqual({
        idEspacio: 2,
        fecha: HOY,
        bloques: [
          {
            idBloque: 9,
            horaInicio: '09:00',
            horaFin: '10:00',
            estado: 'Pasado',
          },
          {
            idBloque: 10,
            horaInicio: '12:00',
            horaFin: '17:00',
            estado: 'Reservado',
          },
          {
            idBloque: 11,
            horaInicio: '18:00',
            horaFin: '22:00',
            estado: 'Libre',
          },
        ],
      });
      expect(mockManager.find).toHaveBeenCalledWith(Reserva, {
        where: {
          idEspacio: 2,
          fechaReserva: HOY,
          estadoReserva: In(ESTADOS_ACTIVOS),
        },
      });
    });

    it('debe buscar el espacio activo de la comunidad del contexto', async () => {
      espacio = null;

      await expect(
        target.disponibilidad(red, { idEspacio: 2, fecha: HOY }),
      ).rejects.toThrow(NotFoundException);
      expect(mockManager.findOne).toHaveBeenCalledWith(EspacioComun, {
        where: { idEspacio: 2, idRed: 3, estado: true },
      });
    });

    it.each([['2026-11-04'], ['2026-11-19']])(
      'debe rechazar el %s por estar fuera de los 14 días',
      async (fecha) => {
        await expect(
          target.disponibilidad(red, { idEspacio: 2, fecha }),
        ).rejects.toThrow('Puedes reservar desde hoy hasta el 18-11-2026');
      },
    );
  });

  describe('crear', () => {
    it('debe reservar el bloque aprobado con la hora de término del bloque y registrar en bitácora', async () => {
      const resultado = await target.crear(red, 11, dto());

      expect(mockManager.findOne).toHaveBeenCalledWith(EspacioComun, {
        where: { idEspacio: 2, idRed: 3, estado: true },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.insert).toHaveBeenCalledWith(Reserva, {
        idRed: 3,
        idEspacio: 2,
        idUsuario: 11,
        idUnidad: 40,
        fechaReserva: MANANA,
        horaInicio: '12:00',
        horaFin: '17:00',
        invitados: 5,
        estadoReserva: EstadoReserva.APROBADA,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 11,
          accion: 'crear_reserva',
          entidad: 'reservas',
          idEntidad: 7,
          detalle: {
            espacio: 'Quincho',
            fecha: MANANA,
            horaInicio: '12:00',
            horaFin: '17:00',
            idUnidad: 40,
          },
        },
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
      expect(resultado).toEqual({
        idReserva: 7,
        idEspacio: 2,
        espacio: 'Quincho',
        idUnidad: 40,
        unidad: {
          idUnidad: 40,
          numeroIdentificador: '10',
          torre: null,
          callePasaje: 'Pasaje A',
        },
        usuario: { idUsuario: 11, nombre: 'Rosa Uno' },
        fecha: '2026-11-08',
        horaInicio: '12:00',
        horaFin: '17:00',
        invitados: 5,
        estado: 'Aprobada',
        motivoCancelacion: null,
        observacionesRecepcion: null,
        entregadoEn: null,
        recibidoEn: null,
        fechaSolicitud: AHORA,
      });
    });

    it('debe guardar cero invitados cuando no se indican', async () => {
      await target.crear(red, 11, dto({ invitados: undefined }));

      expect(mockManager.insert).toHaveBeenCalledWith(
        Reserva,
        expect.objectContaining({ invitados: 0 }),
      );
    });

    it('debe rechazar una unidad que no es de la persona sin abrir transacción', async () => {
      await expect(
        target.crear(red, 11, dto({ idUnidad: 41 })),
      ).rejects.toThrow(NotFoundException);
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('debe rechazar un horario que no existe en el espacio', async () => {
      bloque = null;

      await expect(target.crear(red, 11, dto())).rejects.toThrow(
        new BadRequestException('Ese horario no existe en este espacio'),
      );
    });

    it('debe rechazar un horario de hoy que ya empezó', async () => {
      bloque = {
        idBloque: 9,
        idEspacio: 2,
        horaInicio: '09:00',
        horaFin: '10:00',
      } as ReservaBloque;

      await expect(
        target.crear(red, 11, dto({ fecha: HOY, horaInicio: '09:00' })),
      ).rejects.toThrow('Ese horario ya pasó');
    });

    it('debe rechazar más invitados que la capacidad', async () => {
      await expect(
        target.crear(red, 11, dto({ invitados: 21 })),
      ).rejects.toThrow('Quincho admite hasta 20 personas');
    });

    it('debe rechazar un bloque que se cruza con otra reserva activa', async () => {
      reservasDelDia = [
        crearReserva({ idUnidad: 41, horaInicio: '16:00', horaFin: '18:00' }),
      ];

      await expect(target.crear(red, 11, dto())).rejects.toThrow(
        new ConflictException('Ese horario ya está reservado'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe permitir hasta dos bloques del mismo espacio por vivienda en un día', async () => {
      reservasDelDia = [
        crearReserva({ horaInicio: '08:00', horaFin: '10:00' }),
        crearReserva({ horaInicio: '10:00', horaFin: '12:00' }),
      ];

      await expect(target.crear(red, 11, dto())).rejects.toThrow(
        'Tu vivienda ya tiene 2 horarios de Quincho ese día',
      );
    });

    it('debe aceptar el segundo bloque del día de la vivienda', async () => {
      reservasDelDia = [
        crearReserva({ horaInicio: '08:00', horaFin: '10:00' }),
      ];

      await target.crear(red, 11, dto());

      expect(mockManager.insert).toHaveBeenCalledTimes(1);
    });

    it('no debe contar para el límite de la vivienda las reservas de otras viviendas', async () => {
      reservasDelDia = [
        crearReserva({ idUnidad: 41, horaInicio: '08:00', horaFin: '10:00' }),
        crearReserva({ idUnidad: 41, horaInicio: '10:00', horaFin: '12:00' }),
      ];

      await target.crear(red, 11, dto());

      expect(mockManager.insert).toHaveBeenCalledTimes(1);
    });

    it('debe bloquear el espacio antes de buscar las reservas activas del día', async () => {
      await target.crear(red, 11, dto());

      expect(mockManager.find).toHaveBeenCalledWith(Reserva, {
        where: {
          idEspacio: 2,
          fechaReserva: MANANA,
          estadoReserva: In(ESTADOS_ACTIVOS),
        },
      });
      const bloqueo = mockManager.findOne.mock.calls.findIndex(
        ([entidad]) => entidad === EspacioComun,
      );
      const busqueda = mockManager.find.mock.calls.findIndex(
        ([entidad]) => entidad === Reserva,
      );
      expect(
        mockManager.findOne.mock.invocationCallOrder[bloqueo],
      ).toBeLessThan(mockManager.find.mock.invocationCallOrder[busqueda]);
    });

    it('debe rechazar una fecha posterior a los 14 días sin abrir transacción', async () => {
      await expect(
        target.crear(red, 11, dto({ fecha: '2026-11-19' })),
      ).rejects.toThrow(BadRequestException);
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it.each([
      ['el último día reservable', { fecha: '2026-11-18' }, {}],
      ['tantos invitados como la capacidad', { invitados: 20 }, {}],
      [
        'cualquier cantidad de invitados si el espacio no tiene límite',
        { invitados: 1000 },
        { capacidad: null },
      ],
    ])('debe aceptar %s', async (_caso, cambiosDto, cambiosEspacio) => {
      espacio = crearEspacio(cambiosEspacio);

      await target.crear(red, 11, dto(cambiosDto));

      expect(mockManager.insert).toHaveBeenCalledTimes(1);
    });

    it('debe usar la fecha de Chile cerca de la medianoche', async () => {
      jest.setSystemTime(new Date('2026-11-06T02:30:00.000Z'));
      bloque = {
        idBloque: 9,
        idEspacio: 2,
        horaInicio: '23:45',
        horaFin: '23:59',
      } as ReservaBloque;

      await target.crear(red, 11, dto({ fecha: HOY, horaInicio: '23:45' }));

      expect(mockManager.insert).toHaveBeenCalledWith(
        Reserva,
        expect.objectContaining({ fechaReserva: HOY, horaInicio: '23:45' }),
      );
    });
  });

  describe('mias', () => {
    it('debe listar las reservas de las viviendas de la persona con si puede cancelarlas', async () => {
      reservasDelDia = [
        crearReserva(),
        crearReserva({
          idReserva: 8,
          fechaReserva: MANANA,
          horaInicio: '09:00',
        }),
      ];

      const resultado = await target.mias(red);

      expect(mockManager.find).toHaveBeenCalledWith(Reserva, {
        where: { idRed: 3, idUnidad: In([40]) },
        relations: { espacio: true, unidad: true },
        order: { fechaReserva: 'DESC', horaInicio: 'DESC' },
        take: 100,
      });
      expect(resultado.map((r) => [r.idReserva, r.puedeCancelar])).toEqual([
        [7, true],
        [8, false],
      ]);
    });

    it('debe devolver una lista vacía a quien no tiene vivienda', async () => {
      expect(await target.mias({ ...red, idsUnidades: [] })).toEqual([]);
      expect(mockManager.find).not.toHaveBeenCalled();
    });
  });

  describe('cancelarPropia', () => {
    it('debe cancelar la reserva de su vivienda con más de 24 horas de anticipación', async () => {
      await target.cancelarPropia(red, 11, 7);

      expect(mockManager.findOne).toHaveBeenCalledWith(Reserva, {
        where: { idReserva: 7, idRed: 3, idUnidad: In([40]) },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Reserva,
        { idReserva: 7 },
        { estadoReserva: EstadoReserva.CANCELADA },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'cancelar_reserva',
          detalle: {
            espacio: 'Quincho',
            fecha: '2026-11-08',
            horaInicio: '12:00',
            porResidente: true,
          },
        }),
        mockManager,
      );
    });

    it('debe rechazar la cancelación a menos de 24 horas', async () => {
      reservaEnBd = crearReserva({ fechaReserva: MANANA, horaInicio: '09:00' });

      await expect(target.cancelarPropia(red, 11, 7)).rejects.toThrow(
        'Solo puedes cancelar hasta 24 horas antes. Si necesitas cancelarla, habla con la administración.',
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe rechazar una reserva que ya no está vigente', async () => {
      reservaEnBd = crearReserva({ estadoReserva: EstadoReserva.CANCELADA });

      await expect(target.cancelarPropia(red, 11, 7)).rejects.toThrow(
        new ConflictException('La reserva ya no está vigente'),
      );
    });

    it.each([
      ['no existe o es de otra vivienda', { ...red }],
      ['la persona no tiene vivienda', { ...red, idsUnidades: [] }],
    ])('debe responder 404 cuando %s', async (_caso, contexto) => {
      reservaEnBd = null;

      await expect(target.cancelarPropia(contexto, 11, 7)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('listar', () => {
    it('debe listar las reservas desde hoy de la comunidad, filtrando por espacio', async () => {
      reservasDelDia = [crearReserva()];

      const resultado = await target.listar(red, { idEspacio: 2 });

      expect(mockManager.find).toHaveBeenCalledWith(Reserva, {
        where: { idRed: 3, fechaReserva: MoreThanOrEqual(HOY), idEspacio: 2 },
        relations: { espacio: true, unidad: true },
        order: { fechaReserva: 'ASC', horaInicio: 'ASC', idReserva: 'ASC' },
      });
      expect(resultado).toHaveLength(1);
    });
  });

  describe('cancelarPorAdministracion', () => {
    it('debe cancelar con motivo y enviar los correos después de la transacción', async () => {
      const resultado = await target.cancelarPorAdministracion(red, 1, 7, {
        motivo: 'Mantención',
      });

      expect(resultado.residentesAvisados).toBe(1);
      expect(mockCancelacionesService.cancelar).toHaveBeenCalledWith(
        mockManager,
        3,
        [reservaEnBd],
        expect.any(Function),
        'Mantención',
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'cancelar_reserva',
          detalle: expect.objectContaining({
            motivo: 'Mantención',
            porAdministracion: true,
            residentesAvisados: 1,
          }),
        }),
        mockManager,
      );
      expect(mockCancelacionesService.enviar).toHaveBeenCalledWith([
        { para: 'rosa@x.cl' },
      ]);
    });

    it('debe informar que no se avisó a nadie cuando la unidad no tiene residentes', async () => {
      mockCancelacionesService.cancelar.mockResolvedValue({
        correos: [],
        sinAviso: 1,
      });

      const resultado = await target.cancelarPorAdministracion(red, 1, 7, {
        motivo: 'Mantención',
      });

      expect(resultado.residentesAvisados).toBe(0);
    });

    it.each([
      [
        'ya se entregó',
        { fechaReserva: HOY, entregadoEn: AHORA },
        'El espacio ya se entregó; no se puede cancelar la reserva',
      ],
      [
        'ya empezó',
        { fechaReserva: HOY, horaInicio: '09:00' },
        'La reserva ya empezó',
      ],
    ])('debe rechazar una reserva que %s', async (_caso, cambios, mensaje) => {
      reservaEnBd = crearReserva(cambios);

      await expect(
        target.cancelarPorAdministracion(red, 1, 7, { motivo: 'x' }),
      ).rejects.toThrow(mensaje);
      expect(mockCancelacionesService.enviar).not.toHaveBeenCalled();
    });

    it('debe responder 404 por una reserva de otra comunidad', async () => {
      reservaEnBd = null;

      await expect(
        target.cancelarPorAdministracion(red, 1, 7, { motivo: 'x' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockManager.findOne).toHaveBeenCalledWith(Reserva, {
        where: { idReserva: 7, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
    });
  });

  describe('delDia', () => {
    it('debe agrupar las reservas de hoy por espacio e indicar cuál está en uso', async () => {
      const entregada = crearReserva({ fechaReserva: HOY, entregadoEn: AHORA });
      reservasDelDia = [entregada];

      const resultado = await target.delDia(red);

      expect(mockManager.find).toHaveBeenCalledWith(Reserva, {
        where: [
          { idRed: 3, estadoReserva: In(ESTADOS_ACTIVOS), fechaReserva: HOY },
          {
            idRed: 3,
            estadoReserva: In(ESTADOS_ACTIVOS),
            fechaReserva: LessThan(HOY),
            entregadoEn: Not(IsNull()),
            recibidoEn: IsNull(),
          },
        ],
        relations: { espacio: true, unidad: true },
        order: { fechaReserva: 'ASC', horaInicio: 'ASC' },
      });
      expect(resultado).toEqual({
        fecha: HOY,
        espacios: [
          {
            idEspacio: 2,
            nombre: 'Quincho',
            activo: true,
            enUso: 7,
            reservas: [
              expect.objectContaining({ idReserva: 7, estado: 'Entregado' }),
            ],
            porRecibir: [],
          },
        ],
      });
    });

    it('debe mostrar aparte las entregas de días anteriores sin recibir, sin marcar el espacio en uso', async () => {
      reservasDelDia = [
        crearReserva({ fechaReserva: '2026-11-04', entregadoEn: AHORA }),
      ];

      const [quincho] = (await target.delDia(red)).espacios;

      expect(quincho.enUso).toBeNull();
      expect(quincho.reservas).toEqual([]);
      expect(quincho.porRecibir).toEqual([
        expect.objectContaining({ idReserva: 7, fecha: '2026-11-04' }),
      ]);
    });

    it('debe incluir un espacio dado de baja que tiene una entrega sin recibir', async () => {
      espacio = null;
      reservasDelDia = [
        crearReserva({
          fechaReserva: HOY,
          entregadoEn: AHORA,
          espacio: crearEspacio({ idEspacio: 2, estado: false }),
        }),
      ];

      const { espacios } = await target.delDia(red);

      expect(espacios).toEqual([
        expect.objectContaining({ idEspacio: 2, activo: false, enUso: 7 }),
      ]);
    });
  });

  describe('entregar', () => {
    it('debe entregar la reserva de hoy y registrar quién la entregó', async () => {
      reservaEnBd = crearReserva({ fechaReserva: HOY });

      await target.entregar(red, 5, 7);

      expect(mockManager.findOne).toHaveBeenCalledWith(EspacioComun, {
        where: { idEspacio: 2 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(Reserva, {
        where: {
          idEspacio: 2,
          fechaReserva: HOY,
          idReserva: Not(7),
          entregadoEn: Not(IsNull()),
          recibidoEn: IsNull(),
        },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Reserva,
        { idReserva: 7 },
        { entregadoEn: AHORA, entregadoPor: 5 },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'entregar_espacio' }),
        mockManager,
      );
    });

    it.each([
      ['no es de hoy', {}, 'Solo se entregan las reservas de hoy'],
      [
        'ya se entregó',
        { fechaReserva: HOY, entregadoEn: AHORA },
        'Esta reserva no se puede entregar',
      ],
      [
        'está cancelada',
        { fechaReserva: HOY, estadoReserva: EstadoReserva.CANCELADA },
        'Esta reserva no se puede entregar',
      ],
    ])('debe rechazar una reserva que %s', async (_caso, cambios, mensaje) => {
      reservaEnBd = crearReserva(cambios);

      await expect(target.entregar(red, 5, 7)).rejects.toThrow(mensaje);
    });

    it('debe rechazar la entrega mientras el espacio sigue en uso', async () => {
      reservaEnBd = crearReserva({ fechaReserva: HOY });
      enUso = crearReserva({ idReserva: 6 });

      await expect(target.entregar(red, 5, 7)).rejects.toThrow(
        'Quincho sigue en uso: recíbelo antes de entregarlo de nuevo',
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('recibir', () => {
    beforeEach(() => {
      reservaEnBd = crearReserva({ fechaReserva: HOY, entregadoEn: AHORA });
    });

    it('debe recibir sin novedades cuando no hay observación', async () => {
      await target.recibir(red, 5, 7, {});

      expect(mockManager.update).toHaveBeenCalledWith(
        Reserva,
        { idReserva: 7 },
        {
          recibidoEn: AHORA,
          recibidoPor: 5,
          observacionesRecepcion: 'Sin novedades',
        },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'recibir_espacio',
          detalle: expect.objectContaining({ conObservaciones: false }),
        }),
        mockManager,
      );
    });

    it('debe guardar la observación y marcarla en la bitácora', async () => {
      await target.recibir(red, 5, 7, { observaciones: 'Faltaba una silla' });

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          detalle: {
            espacio: 'Quincho',
            idUnidad: 40,
            observaciones: 'Faltaba una silla',
            conObservaciones: true,
          },
        }),
        mockManager,
      );
    });

    it.each([
      ['no se entregó', { entregadoEn: null }],
      ['ya se recibió', { entregadoEn: AHORA, recibidoEn: AHORA }],
    ])('debe rechazar un espacio que %s', async (_caso, cambios) => {
      reservaEnBd = crearReserva(cambios);

      await expect(target.recibir(red, 5, 7, {})).rejects.toThrow(
        new ConflictException('Este espacio no está entregado'),
      );
    });
  });
});

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import {
  NotificacionEnviada,
  TipoNotificacion,
} from '../finanzas/entities/notificacion-enviada.entity';
import { CorreosComunidadService } from '../mail/correos-comunidad.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CrearVotacionDto } from './dto/votaciones.dto';
import { VotacionOpcion } from './entities/votacion-opcion.entity';
import { TipoVotacion, Votacion } from './entities/votacion.entity';
import { Voto } from './entities/voto.entity';
import { VotacionesService } from './votaciones.service';

const AHORA = new Date('2026-11-05T15:00:00.000Z');
const CIERRE = new Date('2026-11-13T02:59:59.000Z');
const DESPUES_DEL_CIERRE = new Date('2026-11-13T03:00:00.000Z');
const TOTAL_UNIDADES = 4;
const UNIDADES = [40, 41, 42, 43];

describe('VotacionesService', () => {
  let target: VotacionesService;
  let mockManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    exists: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockCorreosService: {
    destinatarios: jest.Mock;
    enviar: jest.Mock;
    enviarEnSegundoPlano: jest.Mock;
  };
  let votacionEnBd: Votacion | null;
  let votaciones: Votacion[] | null;
  let opciones: Partial<VotacionOpcion>[];
  let votos: Partial<Voto>[];
  let titularidades: Partial<Residencia>[];
  let titularesDeLaComunidad: Partial<Residencia>[];
  let conAcceso: number[];
  let recordatorios: Partial<NotificacionEnviada>[];
  let comunidadEnBd: Partial<RedVecinal> | null;
  let esTitular: boolean;
  let yaVoto: boolean;
  let opcionEnBd: VotacionOpcion | null;

  const contexto = (
    roles: RolUsuario[],
    idsUnidades: number[] = [40],
  ): ContextoRed => ({ idRed: 3, roles, modulos: [], idsUnidades });
  const residente = contexto([RolUsuario.RESIDENTE]);
  const secretaria = contexto([RolUsuario.SECRETARIO], []);

  const crearVotacion = (cambios: Partial<Votacion> = {}) =>
    ({
      idVotacion: 5,
      idRed: 3,
      titulo: '¿Pintamos?',
      descripcion: null,
      tipo: TipoVotacion.VOTACION,
      quorumMinimo: 50,
      inicio: AHORA,
      cierre: CIERRE,
      cerradaEn: null,
      ...cambios,
    }) as Votacion;

  const opcionesDe = (idVotacion: number, primera: number) => [
    { idOpcion: primera, idVotacion, texto: 'A favor' },
    { idOpcion: primera + 1, idVotacion, texto: 'En contra' },
  ];

  const dto = (cambios: Partial<CrearVotacionDto> = {}) =>
    ({
      tipo: TipoVotacion.VOTACION,
      titulo: '¿Pintamos?',
      opciones: ['A favor', 'En contra'],
      fechaCierre: '2026-11-12',
      quorum: 50,
      ...cambios,
    }) as CrearVotacionDto;

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    votacionEnBd = crearVotacion();
    votaciones = null;
    opciones = opcionesDe(5, 1);
    votos = [];
    titularidades = [{ idUnidad: 40 }];
    titularesDeLaComunidad = [];
    conAcceso = [];
    recordatorios = [];
    comunidadEnBd = { idRed: 3, nombre: 'Las Palmas' };
    esTitular = true;
    yaVoto = false;
    opcionEnBd = { idOpcion: 1, idVotacion: 5 } as VotacionOpcion;
    mockManager = {
      find: jest.fn((entidad: unknown, opcionesConsulta: { where: object }) => {
        if (entidad === Votacion) {
          return Promise.resolve(
            votaciones ?? (votacionEnBd ? [votacionEnBd] : []),
          );
        }
        if (entidad === VotacionOpcion) {
          return Promise.resolve(opciones);
        }
        if (entidad === Voto) {
          return Promise.resolve(votos);
        }
        if (entidad === Residencia) {
          return Promise.resolve(
            'idUsuario' in opcionesConsulta.where
              ? titularidades
              : titularesDeLaComunidad,
          );
        }
        if (entidad === Membresia) {
          return Promise.resolve(conAcceso.map((idUsuario) => ({ idUsuario })));
        }
        if (entidad === NotificacionEnviada) {
          return Promise.resolve(recordatorios);
        }
        if (entidad === Unidad) {
          return Promise.resolve(UNIDADES.map((idUnidad) => ({ idUnidad })));
        }
        return Promise.resolve([]);
      }),
      findOne: jest.fn((entidad: unknown) => {
        if (entidad === VotacionOpcion) {
          return Promise.resolve(opcionEnBd);
        }
        if (entidad === RedVecinal) {
          return Promise.resolve(comunidadEnBd);
        }
        return Promise.resolve(votacionEnBd);
      }),
      count: jest.fn().mockResolvedValue(TOTAL_UNIDADES),
      exists: jest.fn((entidad: unknown) =>
        Promise.resolve(entidad === Residencia ? esTitular : yaVoto),
      ),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idVotacion: 5 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    mockCorreosService = {
      destinatarios: jest.fn().mockResolvedValue([
        {
          idUsuario: 11,
          nombre: 'Rosa',
          correo: 'rosa@x.cl',
          idsUnidad: [40],
        },
      ]),
      enviar: jest.fn().mockResolvedValue(1),
      enviarEnSegundoPlano: jest.fn(),
    };
    target = new VotacionesService(
      {
        manager: mockManager,
        transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
          trabajo(mockManager),
        ),
      } as never,
      mockBitacoraService as unknown as BitacoraService,
      mockCorreosService as unknown as CorreosComunidadService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe ocultar los conteos a quien no ha votado y decirle por qué vivienda puede votar', async () => {
      const [votacion] = await target.listar(residente, 11);

      expect(mockManager.find).toHaveBeenCalledWith(Votacion, {
        where: { idRed: 3 },
        order: { inicio: 'DESC', idVotacion: 'DESC' },
        take: 50,
      });
      expect(votacion).toEqual({
        idVotacion: 5,
        tipo: 'Votación',
        titulo: '¿Pintamos?',
        descripcion: null,
        quorum: 50,
        inicio: AHORA,
        fechaCierre: '2026-11-12',
        estado: 'Abierta',
        totalUnidades: 4,
        opciones: [
          { idOpcion: 1, texto: 'A favor', votos: null },
          { idOpcion: 2, texto: 'En contra', votos: null },
        ],
        resultado: null,
        misVotos: [],
        puedeVotarPor: [40],
      });
    });

    it('debe mostrar los conteos cuando la vivienda ya votó, sin ganadora mientras siga abierta', async () => {
      votos = [
        { idVotacion: 5, idOpcion: 1, idUnidad: 40 },
        { idVotacion: 5, idOpcion: 1, idUnidad: 41 },
      ];

      const [votacion] = await target.listar(residente, 11);

      expect(votacion.opciones.map((o) => o.votos)).toEqual([2, 0]);
      expect(votacion.resultado).toEqual({
        votos: 2,
        participacion: 50,
        faltan: 2,
        alcanzaQuorum: true,
        idOpcionGanadora: null,
      });
      expect(votacion.misVotos).toEqual([{ idUnidad: 40, idOpcion: 1 }]);
      expect(votacion.puedeVotarPor).toEqual([]);
    });

    it('debe mostrar la ganadora a todos al cerrar con quórum', async () => {
      votacionEnBd = crearVotacion({ cerradaEn: AHORA });
      votos = [
        { idVotacion: 5, idOpcion: 2, idUnidad: 41 },
        { idVotacion: 5, idOpcion: 2, idUnidad: 42 },
      ];

      const [votacion] = await target.listar(residente, 11);

      expect(votacion.estado).toBe('Cerrada');
      expect(votacion.resultado).toEqual({
        votos: 2,
        participacion: 50,
        faltan: 2,
        alcanzaQuorum: true,
        idOpcionGanadora: 2,
      });
      expect(votacion.puedeVotarPor).toEqual([]);
    });

    it('no debe dar ganadora a una votación cerrada sin quórum', async () => {
      votacionEnBd = crearVotacion({ cerradaEn: AHORA });
      votos = [{ idVotacion: 5, idOpcion: 2, idUnidad: 41 }];

      const [votacion] = await target.listar(residente, 11);

      expect(votacion.resultado).toEqual({
        votos: 1,
        participacion: 25,
        faltan: 3,
        alcanzaQuorum: false,
        idOpcionGanadora: null,
      });
    });

    it('debe mostrar a la directiva los conteos, los recordatorios y las viviendas sin un titular con acceso', async () => {
      titularesDeLaComunidad = [
        { idUsuario: 11 },
        { idUsuario: 12 },
        { idUsuario: 13 },
      ];
      conAcceso = [11, 12];
      recordatorios = [{ idVotacion: 5 }, { idVotacion: 5 }];

      const [votacion] = await target.listar(secretaria, 9);

      expect(votacion).toEqual(
        expect.objectContaining({
          opciones: [
            { idOpcion: 1, texto: 'A favor', votos: 0 },
            { idOpcion: 2, texto: 'En contra', votos: 0 },
          ],
          recordatorios: 2,
          unidadesSinTitular: 2,
        }),
      );
      expect(mockManager.find).toHaveBeenCalledWith(Residencia, {
        select: { idUsuario: true },
        where: expect.objectContaining({ unidad: { idRed: 3 }, titular: 1 }),
      });
      expect(mockManager.find).toHaveBeenCalledWith(Membresia, {
        select: { idUsuario: true },
        where: expect.objectContaining({ idRed: 3, activo: true }),
      });
    });

    it('debe separar opciones, votos y recordatorios de cada votación', async () => {
      votaciones = [
        crearVotacion(),
        crearVotacion({ idVotacion: 6, titulo: '¿Cambiamos el portón?' }),
      ];
      opciones = [...opcionesDe(5, 1), ...opcionesDe(6, 3)];
      votos = [
        { idVotacion: 5, idOpcion: 1, idUnidad: 41 },
        { idVotacion: 6, idOpcion: 4, idUnidad: 41 },
        { idVotacion: 6, idOpcion: 4, idUnidad: 42 },
      ];
      recordatorios = [{ idVotacion: 6 }];

      const [primera, segunda] = await target.listar(secretaria, 9);

      expect(primera.opciones).toEqual([
        { idOpcion: 1, texto: 'A favor', votos: 1 },
        { idOpcion: 2, texto: 'En contra', votos: 0 },
      ]);
      expect(primera.recordatorios).toBe(0);
      expect(segunda.opciones).toEqual([
        { idOpcion: 3, texto: 'A favor', votos: 0 },
        { idOpcion: 4, texto: 'En contra', votos: 2 },
      ]);
      expect(segunda.recordatorios).toBe(1);
    });

    it('debe dejar votar por la otra vivienda a quien es titular de dos', async () => {
      titularidades = [{ idUnidad: 40 }, { idUnidad: 41 }];
      votos = [{ idVotacion: 5, idOpcion: 1, idUnidad: 40 }];

      const [votacion] = await target.listar(
        contexto([RolUsuario.RESIDENTE], [40, 41]),
        11,
      );

      expect(votacion.misVotos).toEqual([{ idUnidad: 40, idOpcion: 1 }]);
      expect(votacion.puedeVotarPor).toEqual([41]);
    });

    it('debe mostrar a una secretaria titular su vivienda y los datos de la directiva', async () => {
      const [votacion] = await target.listar(
        contexto([RolUsuario.SECRETARIO], [40]),
        9,
      );

      expect(votacion.puedeVotarPor).toEqual([40]);
      expect(votacion).toEqual(
        expect.objectContaining({ recordatorios: 0, unidadesSinTitular: 4 }),
      );
    });

    it('no debe buscar titularidades de quien no tiene vivienda', async () => {
      await target.listar(contexto([RolUsuario.RESIDENTE], []), 11);

      expect(mockManager.find).not.toHaveBeenCalledWith(
        Residencia,
        expect.anything(),
      );
    });

    it('debe consultar las titularidades solo de las viviendas de la persona', async () => {
      await target.listar(residente, 11);

      expect(mockManager.find).toHaveBeenCalledWith(Residencia, {
        select: { idUnidad: true },
        where: expect.objectContaining({
          idUsuario: 11,
          idUnidad: In([40]),
          titular: 1,
        }),
      });
    });

    it('no debe consultar más cuando no hay votaciones', async () => {
      votacionEnBd = null;

      expect(await target.listar(residente, 11)).toEqual([]);
      expect(mockManager.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('crear', () => {
    it('debe abrir la votación hasta el fin del día de cierre, avisar a los titulares y registrar', async () => {
      await target.crear(secretaria, 9, dto({ descripcion: 'Costo $300.000' }));

      expect(mockManager.insert).toHaveBeenCalledWith(Votacion, {
        idRed: 3,
        titulo: '¿Pintamos?',
        descripcion: 'Costo $300.000',
        tipo: TipoVotacion.VOTACION,
        quorumMinimo: 50,
        inicio: AHORA,
        cierre: CIERRE,
        creadaPor: 9,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(VotacionOpcion, [
        { idVotacion: 5, texto: 'A favor', orden: 0 },
        { idVotacion: 5, texto: 'En contra', orden: 1 },
      ]);
      expect(mockCorreosService.destinatarios).toHaveBeenCalledWith(
        mockManager,
        3,
        UNIDADES,
        { soloTitulares: true },
      );
      expect(mockManager.insert).toHaveBeenCalledWith(NotificacionEnviada, {
        idRed: 3,
        tipo: TipoNotificacion.NUEVA_VOTACION,
        asunto: '¿Pintamos?',
        idVotacion: 5,
        destinatarios: 1,
        enviadoPor: 9,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 9,
          accion: 'crear_votacion',
          entidad: 'votaciones',
          idEntidad: 5,
          detalle: {
            tipo: TipoVotacion.VOTACION,
            titulo: '¿Pintamos?',
            fechaCierre: '2026-11-12',
            quorum: 50,
            destinatarios: 1,
          },
        },
        mockManager,
      );
      const [correos] = mockCorreosService.enviarEnSegundoPlano.mock
        .calls[0] as [{ para: string; asunto: string; texto: string }[]];
      expect(correos).toEqual([
        {
          para: 'rosa@x.cl',
          asunto: 'Nueva votación: ¿Pintamos?',
          texto: expect.stringContaining('hasta el 12-11-2026'),
        },
      ]);
    });

    it('debe guardar una encuesta sin quórum y avisarla como encuesta', async () => {
      await target.crear(
        secretaria,
        9,
        dto({ tipo: TipoVotacion.ENCUESTA, quorum: undefined }),
      );

      expect(mockManager.insert).toHaveBeenCalledWith(
        Votacion,
        expect.objectContaining({ quorumMinimo: null }),
      );
      const [correos] = mockCorreosService.enviarEnSegundoPlano.mock
        .calls[0] as [{ asunto: string }[]];
      expect(correos[0].asunto).toBe('Nueva encuesta: ¿Pintamos?');
    });

    it.each([[['Sí', 'si']], [['Á favor', 'a favor']]])(
      'debe rechazar las opciones repetidas %j sin abrir transacción',
      async (repetidas) => {
        await expect(
          target.crear(secretaria, 9, dto({ opciones: repetidas })),
        ).rejects.toThrow(new BadRequestException('Hay opciones repetidas'));
        expect(mockManager.insert).not.toHaveBeenCalled();
      },
    );

    it('debe rechazar abrir una votación cuando ninguna vivienda tiene un titular con acceso', async () => {
      mockCorreosService.destinatarios.mockResolvedValue([]);

      await expect(target.crear(secretaria, 9, dto())).rejects.toThrow(
        new ConflictException(
          'Ninguna vivienda tiene un titular con acceso a la app; asigna titulares antes de abrir la votación',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockCorreosService.enviarEnSegundoPlano).not.toHaveBeenCalled();
    });

    it('debe responder 404 cuando la comunidad no existe', async () => {
      comunidadEnBd = null;

      await expect(target.crear(secretaria, 9, dto())).rejects.toThrow(
        new NotFoundException('Comunidad no encontrada'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('votar', () => {
    it('debe guardar el voto de la vivienda sin poner la opción en la bitácora', async () => {
      await target.votar(residente, 11, 5, { idOpcion: 1, idUnidad: 40 });

      expect(mockManager.findOne).toHaveBeenCalledWith(Votacion, {
        where: { idVotacion: 5, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.exists).toHaveBeenCalledWith(Residencia, {
        where: expect.objectContaining({
          idUsuario: 11,
          idUnidad: 40,
          titular: 1,
        }),
      });
      expect(mockManager.insert).toHaveBeenCalledWith(Voto, {
        idVotacion: 5,
        idOpcion: 1,
        idUnidad: 40,
        idUsuario: 11,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'votar',
          detalle: { titulo: '¿Pintamos?', idUnidad: 40 },
        }),
        mockManager,
      );
    });

    it('debe rechazar votar por una vivienda que no es de la persona', async () => {
      await expect(
        target.votar(residente, 11, 5, { idOpcion: 1, idUnidad: 41 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('debe dejar votar solo al titular', async () => {
      esTitular = false;

      await expect(
        target.votar(residente, 11, 5, { idOpcion: 1, idUnidad: 40 }),
      ).rejects.toThrow(
        new ForbiddenException('Solo el titular de la vivienda puede votar'),
      );
    });

    it.each([
      [
        'la votación está cerrada',
        () => (votacionEnBd = crearVotacion({ cerradaEn: AHORA })),
        'La votación ya está cerrada',
      ],
      ['la vivienda ya votó', () => (yaVoto = true), 'Tu vivienda ya votó'],
    ])(
      'debe responder conflicto cuando %s',
      async (_caso, preparar, mensaje) => {
        preparar();

        await expect(
          target.votar(residente, 11, 5, { idOpcion: 1, idUnidad: 40 }),
        ).rejects.toThrow(new ConflictException(mensaje));
        expect(mockManager.insert).not.toHaveBeenCalled();
      },
    );

    it('debe rechazar una opción de otra votación', async () => {
      opcionEnBd = null;

      await expect(
        target.votar(residente, 11, 5, { idOpcion: 9, idUnidad: 40 }),
      ).rejects.toThrow('La opción no es de esta votación');
    });

    it('debe responder 404 por una votación de otra comunidad', async () => {
      votacionEnBd = null;

      await expect(
        target.votar(residente, 11, 5, { idOpcion: 1, idUnidad: 40 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cuando venció el plazo sin cierre anticipado', () => {
    beforeEach(() => {
      jest.setSystemTime(DESPUES_DEL_CIERRE);
      votos = [
        { idVotacion: 5, idOpcion: 1, idUnidad: 41 },
        { idVotacion: 5, idOpcion: 1, idUnidad: 42 },
      ];
    });

    it('debe mostrarla cerrada y con su ganadora', async () => {
      const [votacion] = await target.listar(residente, 11);

      expect(votacion.estado).toBe('Cerrada');
      expect(votacion.fechaCierre).toBe('2026-11-12');
      expect(votacion.resultado?.idOpcionGanadora).toBe(1);
      expect(votacion.puedeVotarPor).toEqual([]);
    });

    it.each([
      [
        'votar',
        () => target.votar(residente, 11, 5, { idOpcion: 1, idUnidad: 40 }),
      ],
      ['cerrar', () => target.cerrar(secretaria, 9, 5)],
      ['recordar', () => target.recordar(secretaria, 9, 5)],
    ])('debe rechazar %s', async (_accion, ejecutar) => {
      await expect(ejecutar()).rejects.toThrow(
        new ConflictException('La votación ya está cerrada'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('cerrar', () => {
    it('debe cerrar antes de plazo y registrarlo', async () => {
      await target.cerrar(secretaria, 9, 5);

      expect(mockManager.update).toHaveBeenCalledWith(
        Votacion,
        { idVotacion: 5 },
        { cerradaEn: AHORA },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'cerrar_votacion' }),
        mockManager,
      );
    });

    it('debe rechazar cerrar una votación ya cerrada', async () => {
      votacionEnBd = crearVotacion({ cerradaEn: AHORA });

      await expect(target.cerrar(secretaria, 9, 5)).rejects.toThrow(
        new ConflictException('La votación ya está cerrada'),
      );
    });

    it('debe responder 404 por una votación de otra comunidad', async () => {
      votacionEnBd = null;

      await expect(target.cerrar(secretaria, 9, 5)).rejects.toThrow(
        new NotFoundException('Votación no encontrada'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });
  });

  describe('recordar', () => {
    it('debe avisar solo a los titulares de las viviendas que no votaron e informar cuántos correos salieron', async () => {
      votos = [{ idUnidad: 40 }];

      const resultado = await target.recordar(secretaria, 9, 5);

      expect(mockCorreosService.destinatarios).toHaveBeenCalledWith(
        mockManager,
        3,
        [41, 42, 43],
        { soloTitulares: true },
      );
      expect(mockManager.insert).toHaveBeenCalledWith(
        NotificacionEnviada,
        expect.objectContaining({
          tipo: TipoNotificacion.RECORDATORIO_VOTACION,
          idVotacion: 5,
          destinatarios: 1,
        }),
      );
      expect(mockCorreosService.enviar).toHaveBeenCalledWith([
        {
          para: 'rosa@x.cl',
          asunto: 'Recordatorio: ¿Pintamos?',
          texto: expect.stringContaining('hasta el 12-11-2026'),
        },
      ]);
      expect(resultado).toEqual({ destinatarios: 1, correosEnviados: 1 });
      expect(
        mockBitacoraService.marcarActividad.mock.invocationCallOrder[0],
      ).toBeLessThan(mockCorreosService.enviar.mock.invocationCallOrder[0]);
    });

    it('debe informar los correos que no salieron', async () => {
      mockCorreosService.enviar.mockResolvedValue(0);

      const resultado = await target.recordar(secretaria, 9, 5);

      expect(resultado).toEqual({ destinatarios: 1, correosEnviados: 0 });
    });

    it('debe rechazar el recordatorio cuando todas las viviendas ya votaron', async () => {
      votos = UNIDADES.map((idUnidad) => ({ idUnidad }));

      await expect(target.recordar(secretaria, 9, 5)).rejects.toThrow(
        new ConflictException('Todas las viviendas ya votaron'),
      );
      expect(mockCorreosService.destinatarios).not.toHaveBeenCalled();
      expect(mockCorreosService.enviar).not.toHaveBeenCalled();
    });

    it('debe rechazar el recordatorio cuando las viviendas que faltan no tienen titular con acceso', async () => {
      mockCorreosService.destinatarios.mockResolvedValue([]);

      await expect(target.recordar(secretaria, 9, 5)).rejects.toThrow(
        new ConflictException(
          'Ninguna de las viviendas que faltan por votar tiene un titular con acceso a la app',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockCorreosService.enviar).not.toHaveBeenCalled();
    });

    it('debe rechazar recordar una votación cerrada antes de plazo', async () => {
      votacionEnBd = crearVotacion({ cerradaEn: AHORA });

      await expect(target.recordar(secretaria, 9, 5)).rejects.toThrow(
        new ConflictException('La votación ya está cerrada'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockCorreosService.enviar).not.toHaveBeenCalled();
    });

    it('debe responder 404 por una votación de otra comunidad', async () => {
      votacionEnBd = null;

      await expect(target.recordar(secretaria, 9, 5)).rejects.toThrow(
        new NotFoundException('Votación no encontrada'),
      );
      expect(mockCorreosService.enviar).not.toHaveBeenCalled();
    });
  });
});

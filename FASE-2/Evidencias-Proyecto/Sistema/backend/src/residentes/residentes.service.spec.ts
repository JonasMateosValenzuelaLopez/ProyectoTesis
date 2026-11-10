import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, Not } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import {
  Residencia,
  TipoResidencia,
} from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { InvitarResidenteDto } from './dto/residentes.dto';
import {
  EstadoPersona,
  MENSAJE_DATOS_NO_COINCIDEN,
  ResidentesService,
} from './residentes.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('ResidentesService', () => {
  let target: ResidentesService;
  let mockMembresiasRepository: { find: jest.Mock };
  let mockResidenciasRepository: { find: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    findOneByOrFail: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    exists: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock; manager: object };
  let mockCuentasService: {
    obtenerOCrear: jest.Mock;
    asignarMembresia: jest.Mock;
    asignarResidencia: jest.Mock;
    tienePassword: jest.Mock;
    conPassword: jest.Mock;
    asegurarTitular: jest.Mock;
  };
  let mockAuthService: {
    emitirTokenPassword: jest.Mock;
    urlRestablecer: jest.Mock;
  };
  let mockMailService: { enviar: jest.Mock };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let membresiasDeLaPersona: Membresia[];
  let titulares: Membresia[];
  let residenciasDeLaPersona: Residencia[];

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.ADMINISTRADOR],
    modulos: [],
    idsUnidades: [],
  };

  const usuario = (idUsuario: number, nombre: string) =>
    ({
      idUsuario,
      nombre,
      primerApellido: 'Soto',
      segundoApellido: null,
      pais: 'CL',
      identificador: `${idUsuario}`,
      correo: `${nombre.toLowerCase()}@correo.cl`,
      telefono: null,
    }) as Usuario;

  const membresia = (
    idUsuario: number,
    idRol: RolUsuario,
    cambios: Partial<Membresia> = {},
  ) =>
    ({
      idMembresia: idUsuario * 10 + idRol,
      idUsuario,
      idRed: 3,
      idRol,
      activo: true,
      desde: '2026-01-01',
      hasta: null,
      usuario: usuario(idUsuario, idUsuario === 7 ? 'Ana' : 'Beto'),
      ...cambios,
    }) as Membresia;

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    membresiasDeLaPersona = [membresia(7, RolUsuario.RESIDENTE)];
    titulares = [];
    residenciasDeLaPersona = [];
    mockMembresiasRepository = {
      find: jest.fn(() => Promise.resolve(membresiasDeLaPersona)),
    };
    mockResidenciasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockManager = {
      findOne: jest.fn().mockResolvedValue({ idRed: 3, nombre: 'Robles' }),
      findOneBy: jest
        .fn()
        .mockResolvedValue({ idUnidad: 12, numeroIdentificador: '12' }),
      findOneByOrFail: jest
        .fn()
        .mockResolvedValue({ idRed: 3, nombre: 'Robles' }),
      find: jest.fn((entidad: unknown, opciones: { where: object }) =>
        Promise.resolve(
          entidad === Residencia
            ? residenciasDeLaPersona
            : 'idRol' in opciones.where
              ? titulares
              : membresiasDeLaPersona,
        ),
      ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      exists: jest.fn().mockResolvedValue(true),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
      manager: mockManager,
    };
    mockCuentasService = {
      obtenerOCrear: jest
        .fn()
        .mockResolvedValue({ usuario: usuario(7, 'Ana'), cuentaNueva: true }),
      asignarMembresia: jest.fn().mockResolvedValue(undefined),
      asignarResidencia: jest.fn().mockResolvedValue(undefined),
      tienePassword: jest.fn().mockResolvedValue(false),
      conPassword: jest.fn().mockResolvedValue(new Set<number>()),
      asegurarTitular: jest.fn().mockResolvedValue(null),
    };
    mockAuthService = {
      emitirTokenPassword: jest.fn().mockResolvedValue('token-1'),
      urlRestablecer: jest.fn((token: string) => `http://panel/?t=${token}`),
    };
    mockMailService = { enviar: jest.fn().mockResolvedValue(true) };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ResidentesService,
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        {
          provide: getRepositoryToken(Residencia),
          useValue: mockResidenciasRepository,
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: CuentasService, useValue: mockCuentasService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
        { provide: BitacoraService, useValue: mockBitacoraService },
      ],
    }).compile();

    target = module.get(ResidentesService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe armar cada persona con estado, viviendas vigentes y cargos sin Residente', async () => {
      membresiasDeLaPersona = [
        membresia(7, RolUsuario.RESIDENTE),
        membresia(7, RolUsuario.TESORERO, {
          desde: '2026-03-01',
          hasta: '2026-12-31',
        }),
      ];
      mockResidenciasRepository.find.mockResolvedValue([
        {
          idResidencia: 4,
          idUsuario: 7,
          idUnidad: 12,
          tipo: TipoResidencia.PROPIETARIO,
          unidad: { numeroIdentificador: '12', callePasaje: 'Pasaje 1' },
        },
      ]);
      mockCuentasService.conPassword.mockResolvedValue(new Set([7]));

      const [persona] = await target.listar(red);

      expect(persona).toEqual({
        idUsuario: 7,
        nombre: 'Ana',
        primerApellido: 'Soto',
        segundoApellido: null,
        pais: 'CL',
        identificador: '7',
        correo: 'ana@correo.cl',
        telefono: null,
        estado: EstadoPersona.ACTIVO,
        enComunidadDesde: '2026-01-01',
        viviendas: [
          {
            idResidencia: 4,
            idUnidad: 12,
            numeroIdentificador: '12',
            callePasaje: 'Pasaje 1',
            tipoResidencia: TipoResidencia.PROPIETARIO,
          },
        ],
        cargos: [
          {
            idRol: RolUsuario.TESORERO,
            cargo: 'Tesorero',
            desde: '2026-03-01',
            hasta: '2026-12-31',
          },
        ],
      });
    });

    it.each([
      [
        'Invitado sin contraseña',
        [membresia(7, RolUsuario.RESIDENTE)],
        EstadoPersona.INVITADO,
      ],
      [
        'Desactivado sin membresías vigentes',
        [
          membresia(7, RolUsuario.RESIDENTE, {
            activo: false,
            hasta: '2026-11-05',
          }),
        ],
        EstadoPersona.DESACTIVADO,
      ],
      [
        'Desactivado con su cargo vencido',
        [membresia(7, RolUsuario.CONSERJE, { hasta: '2026-10-31' })],
        EstadoPersona.DESACTIVADO,
      ],
    ])(
      'debe calcular el estado %s',
      async (_caso, membresias: Membresia[], estado: EstadoPersona) => {
        membresiasDeLaPersona = membresias;

        const [persona] = await target.listar(red);

        expect(persona.estado).toBe(estado);
        expect(persona.cargos).toEqual([]);
      },
    );

    it('debe omitir las cuentas eliminadas y ordenar por nombre', async () => {
      membresiasDeLaPersona = [
        membresia(8, RolUsuario.RESIDENTE),
        membresia(7, RolUsuario.RESIDENTE),
        { ...membresia(9, RolUsuario.RESIDENTE), usuario: null } as never,
      ];

      const personas = await target.listar(red);

      expect(personas.map((p) => p.nombre)).toEqual(['Ana', 'Beto']);
    });

    it('debe buscar solo viviendas vigentes de unidades de la comunidad', async () => {
      await target.listar(red);

      expect(mockResidenciasRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            idUsuario: In([7]),
            unidad: { idRed: 3 },
          }),
        }),
      );
    });
  });

  describe('invitar', () => {
    const dto = {
      identificador: '12345678-5',
      nombre: 'Ana',
      primerApellido: 'Soto',
      correo: 'ana@correo.cl',
      idUnidad: 12,
      tipoResidencia: TipoResidencia.ARRENDATARIO,
    } as InvitarResidenteDto;

    it('debe crear la cuenta, el cargo Residente, la vivienda y el enlace de activación', async () => {
      const resultado = await target.invitar(red, 1, dto);

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOneBy).toHaveBeenCalledWith(Unidad, {
        idUnidad: 12,
        idRed: 3,
      });
      expect(mockCuentasService.obtenerOCrear).toHaveBeenCalledWith(
        mockManager,
        { ...dto, pais: 'CL' },
        expect.any(Object),
      );
      expect(mockCuentasService.asignarMembresia).toHaveBeenCalledWith(
        mockManager,
        7,
        3,
        RolUsuario.RESIDENTE,
      );
      expect(mockCuentasService.asignarResidencia).toHaveBeenCalledWith(
        mockManager,
        7,
        12,
        TipoResidencia.ARRENDATARIO,
      );
      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        7,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: 1,
          accion: 'invitar_residente',
          entidad: 'usuarios',
          idEntidad: 7,
          detalle: {
            idUsuario: 7,
            idUnidad: 12,
            tipoResidencia: TipoResidencia.ARRENDATARIO,
            cuentaNueva: true,
          },
        },
        mockManager,
      );
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          para: 'ana@correo.cl',
          texto: expect.stringContaining('http://panel/?t=token-1'),
        }),
      );
      expect(resultado).toEqual(
        expect.objectContaining({ idUsuario: 7, correoEnviado: true }),
      );
    });

    it('no debe emitir enlace a una cuenta existente que ya tiene contraseña', async () => {
      mockCuentasService.obtenerOCrear.mockResolvedValue({
        usuario: usuario(7, 'Ana'),
        cuentaNueva: false,
      });
      mockCuentasService.tienePassword.mockResolvedValue(true);
      membresiasDeLaPersona = [];
      mockMembresiasRepository.find.mockResolvedValue([
        membresia(7, RolUsuario.RESIDENTE),
      ]);

      await target.invitar(red, 1, dto);

      expect(mockAuthService.emitirTokenPassword).not.toHaveBeenCalled();
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          texto: expect.stringContaining('selector de comunidades'),
        }),
      );
    });

    it('no debe revelar ni vincular una cuenta existente si el correo no coincide con el suyo', async () => {
      mockCuentasService.obtenerOCrear.mockResolvedValue({
        usuario: usuario(7, 'Beatriz'),
        cuentaNueva: false,
      });
      membresiasDeLaPersona = [];

      await expect(target.invitar(red, 1, dto)).rejects.toThrow(
        new ConflictException(MENSAJE_DATOS_NO_COINCIDEN),
      );

      expect(mockCuentasService.asignarMembresia).not.toHaveBeenCalled();
      expect(mockCuentasService.asignarResidencia).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe rechazar a quien ya es parte de la comunidad', async () => {
      mockCuentasService.obtenerOCrear.mockResolvedValue({
        usuario: usuario(7, 'Ana'),
        cuentaNueva: false,
      });

      await expect(target.invitar(red, 1, dto)).rejects.toThrow(
        new ConflictException(
          'Esta persona ya es parte de la comunidad. Búscala en la lista.',
        ),
      );

      expect(mockCuentasService.asignarMembresia).not.toHaveBeenCalled();
    });

    it('debe rechazar una unidad de otra comunidad', async () => {
      mockManager.findOneBy.mockResolvedValue(null);

      await expect(target.invitar(red, 1, dto)).rejects.toThrow(
        new BadRequestException('La unidad no pertenece a esta comunidad'),
      );

      expect(mockCuentasService.obtenerOCrear).not.toHaveBeenCalled();
    });
  });

  describe('reenviarInvitacion', () => {
    it('debe emitir un enlace nuevo dentro de una transacción y enviarlo', async () => {
      const resultado = await target.reenviarInvitacion(red, 1, 7);

      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        7,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({ accion: 'reenviar_invitacion' }),
        mockManager,
      );
      expect(resultado).toEqual({ correoEnviado: true });
    });

    it('debe rechazar a quien ya activó su cuenta', async () => {
      mockCuentasService.tienePassword.mockResolvedValue(true);

      await expect(target.reenviarInvitacion(red, 1, 7)).rejects.toThrow(
        new ConflictException('Esta persona ya activó su cuenta'),
      );

      expect(mockAuthService.emitirTokenPassword).not.toHaveBeenCalled();
    });
  });

  describe('asignarCargo', () => {
    it('debe terminar el cargo único de quien lo tenía y asignarlo', async () => {
      titulares = [membresia(8, RolUsuario.PRESIDENTE)];

      await target.asignarCargo(red, 1, 7, {
        idRol: RolUsuario.PRESIDENTE,
      });

      expect(mockManager.find).toHaveBeenCalledWith(Membresia, {
        where: expect.objectContaining({
          idRed: 3,
          idRol: RolUsuario.PRESIDENTE,
          idUsuario: Not(7),
          activo: true,
        }),
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Membresia,
        { idMembresia: In([84]) },
        { activo: false, hasta: '2026-11-05' },
      );
      expect(mockCuentasService.asignarMembresia).toHaveBeenCalledWith(
        mockManager,
        7,
        3,
        RolUsuario.PRESIDENTE,
        null,
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'asignar_cargo',
          detalle: {
            idUsuario: 7,
            cargo: 'Presidente',
            hasta: null,
            reemplaza: [8],
          },
        }),
        mockManager,
      );
    });

    it('no debe tocar a otros Conserjes, porque el cargo no es único', async () => {
      await target.asignarCargo(red, 1, 7, {
        idRol: RolUsuario.CONSERJE,
        hasta: '2026-12-31',
      });

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockCuentasService.asignarMembresia).toHaveBeenCalledWith(
        mockManager,
        7,
        3,
        RolUsuario.CONSERJE,
        '2026-12-31',
      );
    });

    it('debe rechazar un cargo que la persona ya tiene', async () => {
      membresiasDeLaPersona = [
        membresia(7, RolUsuario.RESIDENTE),
        membresia(7, RolUsuario.TESORERO),
      ];

      await expect(
        target.asignarCargo(red, 1, 7, { idRol: RolUsuario.TESORERO }),
      ).rejects.toThrow(new ConflictException('Esta persona ya es Tesorero'));
    });

    it('debe rechazar asignar un cargo a una cuenta desactivada', async () => {
      membresiasDeLaPersona = [
        membresia(7, RolUsuario.RESIDENTE, {
          activo: false,
          hasta: '2026-11-05',
        }),
      ];

      await expect(
        target.asignarCargo(red, 1, 7, { idRol: RolUsuario.TESORERO }),
      ).rejects.toThrow(
        new ConflictException(
          'La cuenta de esta persona está desactivada en esta comunidad',
        ),
      );
    });

    it('debe responder 404 a quien no es de la comunidad', async () => {
      membresiasDeLaPersona = [];

      await expect(
        target.asignarCargo(red, 1, 99, { idRol: RolUsuario.TESORERO }),
      ).rejects.toThrow(new NotFoundException('Persona no encontrada'));
    });
  });

  describe('quitarCargo', () => {
    it('debe terminar el cargo vigente y registrarlo', async () => {
      membresiasDeLaPersona = [
        membresia(7, RolUsuario.RESIDENTE),
        membresia(7, RolUsuario.CONSERJE),
      ];

      await target.quitarCargo(red, 1, 7, RolUsuario.CONSERJE);

      expect(mockManager.update).toHaveBeenCalledWith(
        Membresia,
        { idMembresia: 75 },
        { activo: false, hasta: '2026-11-05' },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'quitar_cargo',
          detalle: { idUsuario: 7, cargo: 'Conserje' },
        }),
        mockManager,
      );
    });

    it('debe responder 404 cuando no tiene ese cargo', async () => {
      await expect(
        target.quitarCargo(red, 1, 7, RolUsuario.CONSERJE),
      ).rejects.toThrow(
        new NotFoundException('Esta persona no tiene ese cargo vigente'),
      );
    });

    it('no debe quitar el cargo Residente', async () => {
      await expect(
        target.quitarCargo(red, 1, 7, RolUsuario.RESIDENTE),
      ).rejects.toThrow(BadRequestException);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('desactivar', () => {
    it('debe terminar todas sus membresías vigentes en la comunidad', async () => {
      membresiasDeLaPersona = [
        membresia(7, RolUsuario.RESIDENTE),
        membresia(7, RolUsuario.SECRETARIO),
      ];

      await target.desactivar(red, 1, 7);

      expect(mockManager.update).toHaveBeenCalledWith(
        Membresia,
        { idMembresia: In([76, 73]) },
        { activo: false, hasta: '2026-11-05' },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'desactivar_persona',
          detalle: {
            idUsuario: 7,
            cargos: ['Secretario'],
            nuevosTitulares: [],
          },
        }),
        mockManager,
      );
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });

    it('debe traspasar la titularidad de sus viviendas a otro residente con acceso', async () => {
      residenciasDeLaPersona = [
        { idUnidad: 12 } as Residencia,
        { idUnidad: 14 } as Residencia,
      ];
      mockCuentasService.asegurarTitular
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(null);

      await target.desactivar(red, 1, 7);

      expect(mockManager.find).toHaveBeenCalledWith(Residencia, {
        select: { idUnidad: true },
        where: expect.objectContaining({ idUsuario: 7, unidad: { idRed: 3 } }),
      });
      expect(mockCuentasService.asegurarTitular).toHaveBeenNthCalledWith(
        1,
        mockManager,
        3,
        12,
      );
      expect(mockCuentasService.asegurarTitular).toHaveBeenNthCalledWith(
        2,
        mockManager,
        3,
        14,
      );
      expect(mockManager.update.mock.invocationCallOrder[0]).toBeLessThan(
        mockCuentasService.asegurarTitular.mock.invocationCallOrder[0],
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'desactivar_persona',
          detalle: {
            idUsuario: 7,
            cargos: [],
            nuevosTitulares: [{ idUnidad: 12, idUsuario: 8 }],
          },
        }),
        mockManager,
      );
    });

    it('no debe dejar que alguien se desactive a sí mismo', async () => {
      await expect(target.desactivar(red, 7, 7)).rejects.toThrow(
        new BadRequestException('No puedes desactivar tu propia cuenta'),
      );

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('reactivar', () => {
    beforeEach(() => {
      membresiasDeLaPersona = [
        membresia(7, RolUsuario.RESIDENTE, {
          activo: false,
          hasta: '2026-11-05',
        }),
      ];
    });

    it('debe devolverle el cargo Residente si tiene una vivienda vigente', async () => {
      await target.reactivar(red, 1, 7);

      expect(mockManager.exists).toHaveBeenCalledWith(Residencia, {
        where: expect.objectContaining({
          idUsuario: 7,
          unidad: { idRed: 3 },
        }),
      });
      expect(mockCuentasService.asignarMembresia).toHaveBeenCalledWith(
        mockManager,
        7,
        3,
        RolUsuario.RESIDENTE,
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'reactivar_persona',
          detalle: { idUsuario: 7, nuevosTitulares: [] },
        }),
        mockManager,
      );
    });

    it('debe dejarla de titular en las viviendas que quedaron sin titular con acceso', async () => {
      residenciasDeLaPersona = [{ idUnidad: 12 } as Residencia];
      mockCuentasService.asegurarTitular.mockResolvedValue(7);

      await target.reactivar(red, 1, 7);

      expect(
        mockCuentasService.asignarMembresia.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockCuentasService.asegurarTitular.mock.invocationCallOrder[0],
      );
      expect(mockCuentasService.asegurarTitular).toHaveBeenCalledWith(
        mockManager,
        3,
        12,
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'reactivar_persona',
          detalle: {
            idUsuario: 7,
            nuevosTitulares: [{ idUnidad: 12, idUsuario: 7 }],
          },
        }),
        mockManager,
      );
    });

    it('debe pedir una nueva invitación si ya no tiene vivienda', async () => {
      mockManager.exists.mockResolvedValue(false);

      await expect(target.reactivar(red, 1, 7)).rejects.toThrow(
        new ConflictException(
          'No tiene una vivienda vigente en la comunidad. Invítala de nuevo indicando su unidad.',
        ),
      );

      expect(mockCuentasService.asignarMembresia).not.toHaveBeenCalled();
    });

    it('debe rechazar una cuenta que ya está activa', async () => {
      membresiasDeLaPersona = [membresia(7, RolUsuario.RESIDENTE)];

      await expect(target.reactivar(red, 1, 7)).rejects.toThrow(
        new ConflictException('La cuenta ya está activa en esta comunidad'),
      );
    });
  });
});

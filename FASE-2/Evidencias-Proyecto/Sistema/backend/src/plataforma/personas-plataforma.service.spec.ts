import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  LessThan,
  Like,
  Repository,
} from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { condicionVigente } from '../common/utils/vigencia';
import { MailService } from '../mail/mail.service';
import {
  EstadoRedVecinal,
  RedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  MENSAJE_BLOQUEO_PROPIO,
  MENSAJE_NO_BLOQUEADA,
  MENSAJE_PERSONA_NO_ENCONTRADA,
  MENSAJE_REENVIO_BLOQUEADA,
  MENSAJE_YA_BLOQUEADA,
  PersonasPlataformaService,
} from './personas-plataforma.service';

const ID_PLATAFORMA = 1;
const ID_PERSONA = 12;
const TOKEN = 'token-de-prueba';
const ENLACE =
  'http://localhost:5173/restablecer-password?token=token-de-prueba';
const CREADA = new Date(2026, 9, 26, 12, 0, 0);

const crearUsuario = (cambios: Partial<Usuario> = {}) =>
  ({
    idUsuario: ID_PERSONA,
    identificador: '12345678-5',
    pais: 'CL',
    nombre: 'Ana',
    primerApellido: 'Pérez',
    segundoApellido: 'Soto',
    correo: 'ana@correo.cl',
    telefono: null,
    esPlataforma: false,
    bloqueado: false,
    motivoBloqueo: null,
    fechaCreacion: CREADA,
    ...cambios,
  }) as Usuario;

const crearMembresia = (
  idRed: number,
  idRol: RolUsuario,
  cambios: Partial<Membresia> = {},
) =>
  ({
    idUsuario: ID_PERSONA,
    idRed,
    idRol,
    red: {
      idRed,
      nombre: `Comunidad ${idRed}`,
      estado: EstadoRedVecinal.ACTIVA,
    } as RedVecinal,
    ...cambios,
  }) as Membresia;

const personaEsperada = (cambios: Record<string, unknown> = {}) => ({
  idUsuario: ID_PERSONA,
  identificador: '12345678-5',
  pais: 'CL',
  nombre: 'Ana Pérez Soto',
  correo: 'ana@correo.cl',
  telefono: null,
  esPlataforma: false,
  bloqueado: false,
  motivoBloqueo: null,
  accesoActivado: true,
  fechaCreacion: CREADA,
  comunidades: [],
  ...cambios,
});

describe('PersonasPlataformaService', () => {
  let target: PersonasPlataformaService;
  let mockUsuariosRepository: jest.Mocked<
    Pick<Repository<Usuario>, 'find' | 'findOne'>
  >;
  let mockMembresiasRepository: jest.Mocked<
    Pick<Repository<Membresia>, 'find'>
  >;
  let mockManager: jest.Mocked<Pick<EntityManager, 'findOne' | 'update'>>;
  let mockBitacoraService: jest.Mocked<Pick<BitacoraService, 'registrar'>>;
  let mockCuentasService: jest.Mocked<
    Pick<CuentasService, 'tienePassword' | 'conPassword'>
  >;
  let mockAuthService: jest.Mocked<
    Pick<AuthService, 'emitirTokenPassword' | 'urlRestablecer'>
  >;
  let mockMailService: jest.Mocked<Pick<MailService, 'enviar'>>;
  const managerGlobal = { global: true };

  beforeEach(async () => {
    mockUsuariosRepository = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(crearUsuario()),
    };
    mockMembresiasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockManager = {
      findOne: jest.fn().mockResolvedValue(crearUsuario()),
      update: jest.fn(),
    } as unknown as typeof mockManager;
    mockBitacoraService = { registrar: jest.fn() };
    mockCuentasService = {
      tienePassword: jest.fn().mockResolvedValue(true),
      conPassword: jest.fn().mockResolvedValue(new Set([ID_PERSONA])),
    };
    mockAuthService = {
      emitirTokenPassword: jest.fn().mockResolvedValue(TOKEN),
      urlRestablecer: jest.fn().mockReturnValue(ENLACE),
    };
    mockMailService = { enviar: jest.fn().mockResolvedValue(true) };

    const modulo = await Test.createTestingModule({
      providers: [
        PersonasPlataformaService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuariosRepository,
        },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        {
          provide: DataSource,
          useValue: {
            manager: managerGlobal,
            transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
              trabajo(mockManager),
            ),
          },
        },
        { provide: BitacoraService, useValue: mockBitacoraService },
        { provide: CuentasService, useValue: mockCuentasService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    target = modulo.get(PersonasPlataformaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe pedir la primera página de lo más nuevo a lo más antiguo', async () => {
      await target.listar({});

      expect(mockUsuariosRepository.find).toHaveBeenCalledWith({
        where: {},
        order: { idUsuario: 'DESC' },
        take: 51,
      });
    });

    it.each([
      ['bloqueadas', { bloqueado: true }],
      ['plataforma', { esPlataforma: true }],
      ['todas', {}],
    ] as const)('debe filtrar por %s', async (filtro, where) => {
      await target.listar({ filtro });

      expect(mockUsuariosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
    });

    it('debe continuar desde el cursor con el límite pedido', async () => {
      await target.listar({ antesDe: 40, limite: 10 });

      expect(mockUsuariosRepository.find).toHaveBeenCalledWith({
        where: { idUsuario: LessThan(40) },
        order: { idUsuario: 'DESC' },
        take: 11,
      });
    });

    it('debe buscar por nombre, apellidos, correo y RUT con comodines escapados', async () => {
      await target.listar({ buscar: '50%_a', filtro: 'bloqueadas' });

      const patron = Like('%50\\%\\_a%');
      expect(mockUsuariosRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [
            { bloqueado: true, nombre: patron },
            { bloqueado: true, primerApellido: patron },
            { bloqueado: true, segundoApellido: patron },
            { bloqueado: true, correo: patron },
            { bloqueado: true, identificador: Like('%50\\%\\_A%') },
          ],
        }),
      );
    });

    it('debe encontrar un RUT escrito con puntos o sin guion', async () => {
      await target.listar({ buscar: '12.345.678-5' });

      const condiciones = mockUsuariosRepository.find.mock.calls[0][0]
        ?.where as Record<string, unknown>[];
      expect(condiciones.slice(4)).toEqual([
        { identificador: Like('%123456785%') },
        { identificador: Like('%12345678-5%') },
      ]);
    });

    it('debe armar cada persona con su acceso y sus comunidades vigentes', async () => {
      mockUsuariosRepository.find.mockResolvedValue([crearUsuario()]);
      mockMembresiasRepository.find.mockResolvedValue([
        crearMembresia(3, RolUsuario.PRESIDENTE),
        crearMembresia(3, RolUsuario.RESIDENTE),
        crearMembresia(5, RolUsuario.RESIDENTE),
        crearMembresia(9, RolUsuario.TESORERO, {
          red: null as unknown as RedVecinal,
        }),
      ]);

      const resultado = await target.listar({});

      expect(resultado).toEqual({
        personas: [
          personaEsperada({
            comunidades: [
              {
                idRed: 3,
                nombre: 'Comunidad 3',
                estado: EstadoRedVecinal.ACTIVA,
                cargos: ['Presidente', 'Residente'],
              },
              {
                idRed: 5,
                nombre: 'Comunidad 5',
                estado: EstadoRedVecinal.ACTIVA,
                cargos: ['Residente'],
              },
            ],
          }),
        ],
        siguiente: null,
      });
      expect(mockMembresiasRepository.find).toHaveBeenCalledWith({
        where: {
          idUsuario: In([ID_PERSONA]),
          activo: true,
          ...condicionVigente(),
        },
        relations: { red: true },
        order: { idRed: 'ASC', idRol: 'ASC' },
      });
      expect(mockCuentasService.conPassword).toHaveBeenCalledWith(
        managerGlobal,
        [ID_PERSONA],
      );
    });

    it('debe marcar sin acceso activado a quien nunca creó contraseña', async () => {
      mockUsuariosRepository.find.mockResolvedValue([crearUsuario()]);
      mockCuentasService.conPassword.mockResolvedValue(new Set());

      const resultado = await target.listar({});

      expect(resultado.personas[0].accesoActivado).toBe(false);
    });

    it('debe devolver el cursor siguiente cuando hay más personas', async () => {
      mockUsuariosRepository.find.mockResolvedValue([
        crearUsuario({ idUsuario: 30 }),
        crearUsuario({ idUsuario: 20 }),
        crearUsuario({ idUsuario: 10 }),
      ]);

      const resultado = await target.listar({ limite: 2 });

      expect(resultado.personas.map((p) => p.idUsuario)).toEqual([30, 20]);
      expect(resultado.siguiente).toBe(20);
    });

    it('no debe consultar membresías cuando no hay personas', async () => {
      const resultado = await target.listar({});

      expect(resultado).toEqual({ personas: [], siguiente: null });
      expect(mockMembresiasRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('bloquear', () => {
    it('debe bloquear la cuenta con su motivo y registrarlo en la bitácora de Plataforma', async () => {
      mockUsuariosRepository.findOne.mockResolvedValue(
        crearUsuario({ bloqueado: true, motivoBloqueo: 'Suplantación' }),
      );

      const resultado = await target.bloquear(
        ID_PERSONA,
        ID_PLATAFORMA,
        'Suplantación',
      );

      expect(mockManager.findOne).toHaveBeenCalledWith(Usuario, {
        where: { idUsuario: ID_PERSONA },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Usuario,
        { idUsuario: ID_PERSONA },
        { bloqueado: true, motivoBloqueo: 'Suplantación' },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.PLATAFORMA,
          idRed: null,
          idUsuario: ID_PLATAFORMA,
          accion: 'bloquear_cuenta',
          entidad: 'usuarios',
          idEntidad: ID_PERSONA,
          detalle: { motivo: 'Suplantación' },
        },
        mockManager,
      );
      expect(resultado).toEqual(
        personaEsperada({ bloqueado: true, motivoBloqueo: 'Suplantación' }),
      );
    });

    it('debe impedir que alguien bloquee su propia cuenta', async () => {
      await expect(
        target.bloquear(ID_PLATAFORMA, ID_PLATAFORMA, 'Prueba'),
      ).rejects.toThrow(new ConflictException(MENSAJE_BLOQUEO_PROPIO));

      expect(mockManager.findOne).not.toHaveBeenCalled();
    });

    it('debe responder 409 cuando la cuenta ya estaba bloqueada', async () => {
      mockManager.findOne.mockResolvedValue(crearUsuario({ bloqueado: true }));

      await expect(
        target.bloquear(ID_PERSONA, ID_PLATAFORMA, 'Otra vez'),
      ).rejects.toThrow(new ConflictException(MENSAJE_YA_BLOQUEADA));

      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });

    it('debe responder 404 cuando la persona no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(
        target.bloquear(99, ID_PLATAFORMA, 'Motivo'),
      ).rejects.toThrow(new NotFoundException(MENSAJE_PERSONA_NO_ENCONTRADA));
    });
  });

  describe('desbloquear', () => {
    it('debe desbloquear la cuenta, limpiar el motivo y registrar el anterior', async () => {
      mockManager.findOne.mockResolvedValue(
        crearUsuario({ bloqueado: true, motivoBloqueo: 'Suplantación' }),
      );

      const resultado = await target.desbloquear(ID_PERSONA, ID_PLATAFORMA);

      expect(mockManager.update).toHaveBeenCalledWith(
        Usuario,
        { idUsuario: ID_PERSONA },
        { bloqueado: false, motivoBloqueo: null },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.PLATAFORMA,
          idRed: null,
          idUsuario: ID_PLATAFORMA,
          accion: 'desbloquear_cuenta',
          entidad: 'usuarios',
          idEntidad: ID_PERSONA,
          detalle: { motivoAnterior: 'Suplantación' },
        },
        mockManager,
      );
      expect(resultado).toEqual(personaEsperada());
    });

    it('debe responder 409 cuando la cuenta no estaba bloqueada', async () => {
      await expect(
        target.desbloquear(ID_PERSONA, ID_PLATAFORMA),
      ).rejects.toThrow(new ConflictException(MENSAJE_NO_BLOQUEADA));

      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe responder 404 cuando la persona no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(target.desbloquear(99, ID_PLATAFORMA)).rejects.toThrow(
        new NotFoundException(MENSAJE_PERSONA_NO_ENCONTRADA),
      );
    });
  });

  describe('reenviarAcceso', () => {
    it('debe enviar un enlace de recuperación a quien ya tiene contraseña', async () => {
      const resultado = await target.reenviarAcceso(ID_PERSONA, ID_PLATAFORMA);

      expect(mockCuentasService.tienePassword).toHaveBeenCalledWith(
        mockManager,
        ID_PERSONA,
      );
      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        ID_PERSONA,
        TipoTokenPassword.RECUPERACION,
        mockManager,
      );
      expect(mockMailService.enviar).toHaveBeenCalledWith({
        para: 'ana@correo.cl',
        asunto: 'Recupera el acceso a tu cuenta de EntreCasas',
        texto: expect.stringContaining(ENLACE),
      });
      expect(resultado).toEqual({
        tipo: TipoTokenPassword.RECUPERACION,
        correoEnviado: true,
      });
    });

    it('debe enviar un enlace de activación a quien nunca creó contraseña', async () => {
      mockCuentasService.tienePassword.mockResolvedValue(false);

      const resultado = await target.reenviarAcceso(ID_PERSONA, ID_PLATAFORMA);

      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        ID_PERSONA,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
      expect(mockMailService.enviar).toHaveBeenCalledWith({
        para: 'ana@correo.cl',
        asunto: 'Activa tu cuenta de EntreCasas',
        texto: expect.stringContaining('válido por 3 días'),
      });
      expect(resultado).toEqual({
        tipo: TipoTokenPassword.ACTIVACION,
        correoEnviado: true,
      });
    });

    it('debe registrar el reenvío en la bitácora antes de enviar el correo', async () => {
      await target.reenviarAcceso(ID_PERSONA, ID_PLATAFORMA);

      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.PLATAFORMA,
          idRed: null,
          idUsuario: ID_PLATAFORMA,
          accion: 'reenviar_acceso',
          entidad: 'usuarios',
          idEntidad: ID_PERSONA,
          detalle: { tipo: TipoTokenPassword.RECUPERACION },
        },
        mockManager,
      );
      expect(
        mockBitacoraService.registrar.mock.invocationCallOrder[0],
      ).toBeLessThan(mockMailService.enviar.mock.invocationCallOrder[0]);
    });

    it('debe informar correoEnviado false cuando el correo no salió', async () => {
      mockMailService.enviar.mockResolvedValue(false);

      const resultado = await target.reenviarAcceso(ID_PERSONA, ID_PLATAFORMA);

      expect(resultado.correoEnviado).toBe(false);
    });

    it('debe responder 409 sin emitir token cuando la cuenta está bloqueada', async () => {
      mockManager.findOne.mockResolvedValue(crearUsuario({ bloqueado: true }));

      await expect(
        target.reenviarAcceso(ID_PERSONA, ID_PLATAFORMA),
      ).rejects.toThrow(new ConflictException(MENSAJE_REENVIO_BLOQUEADA));

      expect(mockAuthService.emitirTokenPassword).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe responder 404 cuando la persona no existe', async () => {
      mockManager.findOne.mockResolvedValue(null);

      await expect(target.reenviarAcceso(99, ID_PLATAFORMA)).rejects.toThrow(
        new NotFoundException(MENSAJE_PERSONA_NO_ENCONTRADA),
      );
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });
  });
});

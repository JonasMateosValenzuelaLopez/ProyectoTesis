import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Rol } from '../roles/entities/rol.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CrearSolicitudAccesoDto } from './dto/crear-solicitud-acceso.dto';
import {
  EstadoSolicitudAcceso,
  SolicitudAcceso,
} from './entities/solicitud-acceso.entity';
import { SolicitudesAccesoService } from './solicitudes-acceso.service';

// bcrypt real tarda ~100 ms por hash; aquí solo importa que se genere uno.
// hashSync lo usa AuthService al importarse (HASH_FALSO).
jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => 'hash-falso'),
  hash: jest.fn().mockResolvedValue('hash-aleatorio'),
}));

const RED: ContextoRed = {
  idRed: 3,
  idMembresia: 30,
  idUnidad: 12,
  roles: [RolUsuario.ADMINISTRACION],
};
const ID_RESOLUTOR = 1;
const ID_USUARIO_NUEVO = 50;
const ROL_RESIDENTE = { idRol: RolUsuario.RESIDENTE, nombreRol: 'Residente' };
const ROL_ADMINISTRACION = {
  idRol: RolUsuario.ADMINISTRACION,
  nombreRol: 'Administración',
};

const MENSAJE_SOLICITUD_RECIBIDA =
  'Recibimos tu solicitud. La administración validará tus datos y te avisará por correo.';

type Escenario = {
  solicitud?: Partial<SolicitudAcceso> | null;
  unidad?: Partial<Unidad> | null;
  porRut?: Partial<Usuario> | null;
  porCorreo?: Partial<Usuario> | null;
  membresia?: Partial<Membresia> | null;
};

describe('SolicitudesAccesoService', () => {
  let target: SolicitudesAccesoService;
  let mockSolicitudesRepository: {
    existsBy: jest.Mock;
    insert: jest.Mock;
    find: jest.Mock;
  };
  let mockRedesRepository: { find: jest.Mock; findOneBy: jest.Mock };
  let mockUnidadesRepository: { findOneBy: jest.Mock };
  let mockMembresiasRepository: { exists: jest.Mock };
  let mockAuthService: {
    emitirTokenPassword: jest.Mock;
    urlRestablecer: jest.Mock;
  };
  let mockMailService: { enviar: jest.Mock };
  let mockManager: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    findOneByOrFail: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    restore: jest.Mock;
  };

  const crearSolicitud = (cambios: Partial<SolicitudAcceso> = {}) =>
    ({
      idSolicitud: 80,
      idRed: RED.idRed,
      idUnidad: 12,
      numeroUnidad: 'A-101',
      rut: '12345678-5',
      nombre: 'Ana',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Soto',
      correo: 'ana@correo.cl',
      telefono: null,
      estado: EstadoSolicitudAcceso.PENDIENTE,
      ...cambios,
    }) as SolicitudAcceso;

  const crearUsuarioExistente = (cambios: Partial<Usuario> = {}) =>
    ({
      idUsuario: 7,
      rut: '12345678-5',
      nombre: 'Ana',
      correo: 'ana@correo.cl',
      estado: true,
      fechaEliminacion: null,
      ...cambios,
    }) as Usuario;

  // El manager responde según la entidad consultada, igual que TypeORM.
  const configurarManager = (escenario: Escenario = {}) => {
    const {
      solicitud = crearSolicitud(),
      unidad = { idUnidad: 12, idRed: RED.idRed },
      porRut = null,
      porCorreo = null,
      membresia = null,
    } = escenario;
    mockManager.findOne.mockImplementation(
      (entidad: unknown, opciones: { where: Record<string, unknown> }) => {
        if (entidad === SolicitudAcceso) return Promise.resolve(solicitud);
        if (entidad === Membresia) return Promise.resolve(membresia);
        if (entidad === Usuario) {
          return Promise.resolve('rut' in opciones.where ? porRut : porCorreo);
        }
        return Promise.resolve(null);
      },
    );
    mockManager.findOneBy.mockImplementation((entidad: unknown) =>
      Promise.resolve(entidad === Unidad ? unidad : null),
    );
  };

  const membresiaGuardada = () =>
    mockManager.save.mock.calls
      .map(([entidad]) => entidad as Membresia)
      .find((entidad) => 'roles' in entidad);

  beforeEach(async () => {
    mockSolicitudesRepository = {
      existsBy: jest.fn().mockResolvedValue(false),
      insert: jest.fn(),
      find: jest.fn(),
    };
    mockRedesRepository = {
      find: jest.fn(),
      findOneBy: jest.fn().mockResolvedValue({ idRed: RED.idRed }),
    };
    mockUnidadesRepository = { findOneBy: jest.fn().mockResolvedValue(null) };
    mockMembresiasRepository = { exists: jest.fn().mockResolvedValue(false) };
    mockAuthService = {
      emitirTokenPassword: jest.fn().mockResolvedValue('token-activacion'),
      urlRestablecer: jest.fn(
        (token: string) =>
          `http://localhost:5173/restablecer-password?token=${token}`,
      ),
    };
    mockMailService = { enviar: jest.fn().mockResolvedValue(true) };
    mockManager = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      findOneByOrFail: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === Rol ? ROL_RESIDENTE : { nombre: 'Villa Los Aromos' },
        ),
      ),
      create: jest.fn((_entidad: unknown, datos: object) => ({ ...datos })),
      save: jest.fn((entidad: Record<string, unknown>) =>
        Promise.resolve(
          'passwordHash' in entidad
            ? { ...entidad, idUsuario: ID_USUARIO_NUEVO }
            : entidad,
        ),
      ),
      restore: jest.fn(),
    };
    configurarManager();

    const module = await Test.createTestingModule({
      providers: [
        SolicitudesAccesoService,
        {
          provide: getRepositoryToken(SolicitudAcceso),
          useValue: mockSolicitudesRepository,
        },
        {
          provide: getRepositoryToken(RedVecinal),
          useValue: mockRedesRepository,
        },
        {
          provide: getRepositoryToken(Unidad),
          useValue: mockUnidadesRepository,
        },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MailService, useValue: mockMailService },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
              trabajo(mockManager),
            ),
          },
        },
      ],
    }).compile();

    target = module.get(SolicitudesAccesoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('crear', () => {
    const dto: CrearSolicitudAccesoDto = {
      idRed: RED.idRed,
      numeroUnidad: 'A-101',
      rut: '12.345.678-5',
      nombre: 'Ana',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Soto',
      correo: 'ana@correo.cl',
    } as CrearSolicitudAccesoDto;

    it('debe guardar la solicitud con el RUT normalizado y la unidad encontrada', async () => {
      // Arrange
      mockUnidadesRepository.findOneBy.mockResolvedValue({ idUnidad: 12 });

      // Act
      const resultado = await target.crear(dto);

      // Assert
      expect(resultado).toEqual({ mensaje: MENSAJE_SOLICITUD_RECIBIDA });
      expect(mockSolicitudesRepository.insert).toHaveBeenCalledWith({
        idRed: RED.idRed,
        idUnidad: 12,
        numeroUnidad: 'A-101',
        rut: '12345678-5',
        nombre: 'Ana',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'Soto',
        correo: 'ana@correo.cl',
        telefono: null,
      });
    });

    it('debe guardar idUnidad null cuando el número de unidad no coincide', async () => {
      // Act
      await target.crear(dto);

      // Assert
      expect(mockSolicitudesRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ idUnidad: null }),
      );
    });

    it.each([
      ['ya tiene una solicitud pendiente', true, false],
      ['ya es miembro de la comunidad', false, true],
    ])(
      'debe responder lo mismo sin guardar cuando la persona %s',
      async (_caso, yaPendiente, yaMiembro) => {
        // Arrange
        mockSolicitudesRepository.existsBy.mockResolvedValue(yaPendiente);
        mockMembresiasRepository.exists.mockResolvedValue(yaMiembro);

        // Act
        const resultado = await target.crear(dto);

        // Assert
        expect(resultado).toEqual({ mensaje: MENSAJE_SOLICITUD_RECIBIDA });
        expect(mockSolicitudesRepository.insert).not.toHaveBeenCalled();
      },
    );

    it('debe buscar pendientes y miembros con el RUT normalizado', async () => {
      // Act
      await target.crear(dto);

      // Assert
      expect(mockSolicitudesRepository.existsBy).toHaveBeenCalledWith({
        idRed: RED.idRed,
        rut: '12345678-5',
        estado: EstadoSolicitudAcceso.PENDIENTE,
      });
      expect(mockMembresiasRepository.exists).toHaveBeenCalledWith({
        where: {
          idRed: RED.idRed,
          estado: true,
          usuario: { rut: '12345678-5' },
        },
      });
    });

    it('debe lanzar NotFoundException cuando la comunidad no existe', async () => {
      // Arrange
      mockRedesRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(target.crear(dto)).rejects.toThrow(
        new NotFoundException('La comunidad no existe'),
      );
      expect(mockSolicitudesRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('debe filtrar siempre por la comunidad del administrador', async () => {
      // Act
      await target.listar(RED, EstadoSolicitudAcceso.PENDIENTE);

      // Assert
      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { idRed: RED.idRed, estado: EstadoSolicitudAcceso.PENDIENTE },
        }),
      );
    });

    it('no debe filtrar por estado cuando no se indica', async () => {
      // Act
      await target.listar(RED);

      // Assert
      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idRed: RED.idRed } }),
      );
    });
  });

  describe('aprobar', () => {
    it('debe crear la cuenta, la membresía de Residente y enviar el enlace de activación', async () => {
      // Act
      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {});

      // Assert
      expect(mockManager.create).toHaveBeenCalledWith(
        Usuario,
        expect.objectContaining({
          rut: '12345678-5',
          correo: 'ana@correo.cl',
          passwordHash: 'hash-aleatorio',
          estado: true,
        }),
      );
      expect(membresiaGuardada()).toEqual(
        expect.objectContaining({
          idUsuario: ID_USUARIO_NUEVO,
          idRed: RED.idRed,
          idUnidad: 12,
          estado: true,
          roles: [ROL_RESIDENTE],
        }),
      );
      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        ID_USUARIO_NUEVO,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          para: 'ana@correo.cl',
          texto: expect.stringContaining('token=token-activacion'),
        }),
      );
      expect(resultado).toEqual(
        expect.objectContaining({
          estado: EstadoSolicitudAcceso.APROBADA,
          idUnidad: 12,
          idUsuarioResolutor: ID_RESOLUTOR,
          idUsuarioCreado: ID_USUARIO_NUEVO,
          fechaResolucion: expect.any(Date),
          correoEnviado: true,
        }),
      );
    });

    it('debe informar correoEnviado false cuando el correo de activación no sale', async () => {
      // Arrange
      mockMailService.enviar.mockResolvedValue(false);

      // Act
      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {});

      // Assert
      expect(resultado).toEqual(
        expect.objectContaining({
          estado: EstadoSolicitudAcceso.APROBADA,
          correoEnviado: false,
        }),
      );
    });

    it('debe reutilizar la cuenta existente sin emitir token de activación', async () => {
      // Arrange
      const usuario = crearUsuarioExistente();
      configurarManager({ porRut: usuario, porCorreo: usuario });

      // Act
      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {});

      // Assert
      expect(mockManager.create).not.toHaveBeenCalledWith(
        Usuario,
        expect.anything(),
      );
      expect(mockAuthService.emitirTokenPassword).not.toHaveBeenCalled();
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          texto: expect.stringContaining('con tu cuenta actual'),
        }),
      );
      expect(resultado.idUsuarioCreado).toBe(7);
    });

    it('debe restaurar una cuenta con borrado lógico', async () => {
      // Arrange
      const usuario = crearUsuarioExistente({ fechaEliminacion: new Date() });
      configurarManager({ porRut: usuario, porCorreo: usuario });

      // Act
      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      // Assert
      expect(mockManager.restore).toHaveBeenCalledWith(Usuario, {
        idUsuario: 7,
      });
    });

    it('debe lanzar ConflictException sin modificar nada cuando la cuenta está desactivada', async () => {
      // Arrange
      const usuario = crearUsuarioExistente({ estado: false });
      configurarManager({ porRut: usuario, porCorreo: usuario });

      // Act & Assert
      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException(
          'La cuenta de esta persona está desactivada. Reactívala antes de aprobar la solicitud.',
        ),
      );
      expect(mockManager.restore).not.toHaveBeenCalled();
      expect(mockManager.save).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe restaurar la membresía eliminada solo con el rol Residente', async () => {
      // Arrange: el borrado lógico no toca membresias_roles, así que la
      // membresía eliminada todavía trae su rol de Administración.
      const usuario = crearUsuarioExistente();
      configurarManager({
        porRut: usuario,
        porCorreo: usuario,
        membresia: {
          idMembresia: 30,
          idUsuario: 7,
          idRed: RED.idRed,
          estado: false,
          fechaEliminacion: new Date(),
          roles: [ROL_ADMINISTRACION] as Rol[],
        },
      });

      // Act
      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      // Assert
      expect(mockManager.restore).toHaveBeenCalledWith(Membresia, {
        idMembresia: 30,
      });
      expect(membresiaGuardada()).toEqual(
        expect.objectContaining({
          idMembresia: 30,
          estado: true,
          fechaEliminacion: null,
          roles: [ROL_RESIDENTE],
        }),
      );
    });

    it('no debe duplicar el rol Residente en una membresía vigente que ya lo tiene', async () => {
      // Arrange
      const usuario = crearUsuarioExistente();
      configurarManager({
        porRut: usuario,
        porCorreo: usuario,
        membresia: {
          idMembresia: 30,
          estado: true,
          fechaEliminacion: null,
          roles: [ROL_ADMINISTRACION, ROL_RESIDENTE] as Rol[],
        },
      });

      // Act
      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      // Assert
      expect(mockManager.restore).not.toHaveBeenCalled();
      expect(membresiaGuardada()?.roles).toEqual([
        ROL_ADMINISTRACION,
        ROL_RESIDENTE,
      ]);
    });

    it('debe lanzar ConflictException cuando el correo pertenece a otra persona', async () => {
      // Arrange
      configurarManager({
        porRut: null,
        porCorreo: crearUsuarioExistente({ idUsuario: 99, rut: '11111111-1' }),
      });

      // Act & Assert
      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException(
          'El correo de la solicitud ya está registrado por otra persona',
        ),
      );
      expect(mockManager.save).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException cuando la unidad es de otra comunidad', async () => {
      // Arrange
      configurarManager({ unidad: null });

      // Act & Assert
      await expect(
        target.aprobar(80, RED, ID_RESOLUTOR, { idUnidad: 999 }),
      ).rejects.toThrow(
        new BadRequestException('La unidad no pertenece a esta comunidad'),
      );
      expect(mockManager.findOneBy).toHaveBeenCalledWith(Unidad, {
        idUnidad: 999,
        idRed: RED.idRed,
      });
    });

    it('debe lanzar BadRequestException cuando no hay unidad detectada ni indicada', async () => {
      // Arrange
      configurarManager({ solicitud: crearSolicitud({ idUnidad: null }) });

      // Act & Assert
      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new BadRequestException(
          'No existe la unidad "A-101" en esta comunidad. Indica idUnidad para aprobar.',
        ),
      );
    });

    it('debe usar la unidad indicada por la administración en vez de la detectada', async () => {
      // Arrange
      configurarManager({ unidad: { idUnidad: 15, idRed: RED.idRed } });

      // Act
      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {
        idUnidad: 15,
      });

      // Assert
      expect(resultado.idUnidad).toBe(15);
      expect(membresiaGuardada()?.idUnidad).toBe(15);
    });

    it('debe buscar la solicitud solo en la comunidad del administrador y bloquearla', async () => {
      // Arrange
      configurarManager({ solicitud: null });

      // Act & Assert
      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new NotFoundException('Solicitud no encontrada'),
      );
      expect(mockManager.findOne).toHaveBeenCalledWith(SolicitudAcceso, {
        where: { idSolicitud: 80, idRed: RED.idRed },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('debe lanzar ConflictException cuando la solicitud ya fue resuelta', async () => {
      // Arrange
      configurarManager({
        solicitud: crearSolicitud({ estado: EstadoSolicitudAcceso.RECHAZADA }),
      });

      // Act & Assert
      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException('Esta solicitud ya fue resuelta'),
      );
      expect(mockManager.save).not.toHaveBeenCalled();
    });
  });

  describe('rechazar', () => {
    it('debe marcar la solicitud como rechazada y enviar el motivo por correo', async () => {
      // Act
      const resultado = await target.rechazar(80, RED, ID_RESOLUTOR, {
        motivo: 'La unidad no corresponde',
      });

      // Assert
      expect(resultado).toEqual(
        expect.objectContaining({
          estado: EstadoSolicitudAcceso.RECHAZADA,
          motivoRechazo: 'La unidad no corresponde',
          idUsuarioResolutor: ID_RESOLUTOR,
          fechaResolucion: expect.any(Date),
        }),
      );
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          para: 'ana@correo.cl',
          asunto: 'Tu solicitud de acceso a Villa Los Aromos',
          texto: expect.stringContaining('Motivo: La unidad no corresponde'),
        }),
      );
    });

    it('debe guardar motivo null y omitirlo en el correo cuando viene vacío', async () => {
      // Act
      const resultado = await target.rechazar(80, RED, ID_RESOLUTOR, {
        motivo: '',
      });

      // Assert
      expect(resultado.motivoRechazo).toBeNull();
      expect(mockMailService.enviar).toHaveBeenCalledWith(
        expect.objectContaining({
          texto: expect.not.stringContaining('Motivo:'),
        }),
      );
    });

    it('debe fallar sin enviar correo cuando no encuentra la comunidad dentro de la transacción', async () => {
      // Arrange
      mockManager.findOneByOrFail.mockRejectedValue(
        new Error('EntityNotFoundError'),
      );

      // Act & Assert
      await expect(
        target.rechazar(80, RED, ID_RESOLUTOR, { motivo: 'x' }),
      ).rejects.toThrow('EntityNotFoundError');
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException cuando la solicitud ya fue resuelta', async () => {
      // Arrange
      configurarManager({
        solicitud: crearSolicitud({ estado: EstadoSolicitudAcceso.APROBADA }),
      });

      // Act & Assert
      await expect(target.rechazar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException('Esta solicitud ya fue resuelta'),
      );
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });
  });
});

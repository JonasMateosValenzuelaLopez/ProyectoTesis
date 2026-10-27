import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, IsNull, Not } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { MailService } from '../mail/mail.service';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import {
  EstadoRedVecinal,
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import {
  Residencia,
  TipoResidencia,
} from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CrearSolicitudAccesoDto } from './dto/crear-solicitud-acceso.dto';
import {
  EstadoSolicitudAcceso,
  SolicitudAcceso,
} from './entities/solicitud-acceso.entity';
import { SolicitudesAccesoService } from './solicitudes-acceso.service';

jest.mock('bcryptjs', () => ({ hashSync: jest.fn(() => 'hash-falso') }));

const AHORA = new Date(2026, 9, 26, 12, 0, 0);
const HOY = '2026-10-26';

const RED: ContextoRed = {
  idRed: 3,
  roles: [RolUsuario.ADMINISTRADOR],
  modulos: [CodigoModulo.MURO],
  idsUnidades: [],
};
const ID_RESOLUTOR = 1;
const ID_USUARIO_NUEVO = 50;

const MENSAJE_SOLICITUD_RECIBIDA =
  'Recibimos tu solicitud. La administración validará tus datos y te avisará por correo.';

type Escenario = {
  solicitud?: Partial<SolicitudAcceso> | null;
  unidad?: Partial<Unidad> | null;
  porIdentificador?: Partial<Usuario> | null;
  porCorreo?: Partial<Usuario> | null;
  residente?: Partial<Membresia> | null;
  residencia?: Partial<Residencia> | null;
  red?: Partial<RedVecinal> | null;
  conPassword?: boolean;
};

describe('SolicitudesAccesoService', () => {
  let target: SolicitudesAccesoService;
  let mockSolicitudesRepository: {
    existsBy: jest.Mock;
    insert: jest.Mock;
    find: jest.Mock;
  };
  let mockRedesRepository: { find: jest.Mock; findOneBy: jest.Mock };
  let mockRedModulosRepository: { find: jest.Mock };
  let mockUnidadesRepository: { findOneBy: jest.Mock };
  let mockMembresiasRepository: { exists: jest.Mock };
  let mockAuthService: {
    emitirTokenPassword: jest.Mock;
    urlRestablecer: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let mockMailService: { enviar: jest.Mock };
  let usuariosCreados: WeakSet<object>;
  let mockManager: {
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    exists: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    restore: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
  };

  const crearSolicitud = (cambios: Partial<SolicitudAcceso> = {}) =>
    ({
      idSolicitud: 80,
      idRed: RED.idRed,
      idUnidad: 12,
      numeroUnidad: 'A-101',
      tipoResidencia: TipoResidencia.PROPIETARIO,
      identificador: '12345678-5',
      pais: 'CL',
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
      identificador: '12345678-5',
      pais: 'CL',
      nombre: 'Ana',
      correo: 'ana@correo.cl',
      bloqueado: false,
      fechaEliminacion: null,
      ...cambios,
    }) as Usuario;

  const configurarManager = (escenario: Escenario = {}) => {
    const {
      solicitud = crearSolicitud(),
      unidad = { idUnidad: 12, idRed: RED.idRed },
      porIdentificador = null,
      porCorreo = null,
      residente = null,
      residencia = null,
      red = { idRed: RED.idRed, nombre: 'Villa Los Aromos' },
      conPassword = true,
    } = escenario;
    mockManager.exists.mockResolvedValue(conPassword);
    mockManager.findOne.mockImplementation(
      (entidad: unknown, opciones: { where: Record<string, unknown> }) => {
        if (entidad === SolicitudAcceso) return Promise.resolve(solicitud);
        if (entidad === Membresia) return Promise.resolve(residente);
        if (entidad === Residencia) return Promise.resolve(residencia);
        if (entidad === Usuario) {
          return Promise.resolve(
            'identificador' in opciones.where ? porIdentificador : porCorreo,
          );
        }
        return Promise.resolve(null);
      },
    );
    mockManager.findOneBy.mockImplementation((entidad: unknown) => {
      if (entidad === Unidad) return Promise.resolve(unidad);
      if (entidad === RedVecinal) return Promise.resolve(red);
      return Promise.resolve(null);
    });
  };

  const insertado = (entidad: unknown) =>
    mockManager.insert.mock.calls.find(([clase]) => clase === entidad)?.[1];

  beforeEach(async () => {
    jest.useFakeTimers({ now: AHORA });
    mockSolicitudesRepository = {
      existsBy: jest.fn().mockResolvedValue(false),
      insert: jest.fn(),
      find: jest.fn(),
    };
    mockRedesRepository = {
      find: jest.fn(),
      findOneBy: jest.fn().mockResolvedValue({
        idRed: RED.idRed,
        estado: EstadoRedVecinal.ACTIVA,
      }),
    };
    mockRedModulosRepository = { find: jest.fn().mockResolvedValue([]) };
    mockUnidadesRepository = { findOneBy: jest.fn() };
    mockMembresiasRepository = { exists: jest.fn().mockResolvedValue(false) };
    mockAuthService = {
      emitirTokenPassword: jest.fn().mockResolvedValue('token-activacion'),
      urlRestablecer: jest.fn(
        (token: string) =>
          `http://localhost:5173/restablecer-password?token=${token}`,
      ),
    };
    mockBitacoraService = { registrar: jest.fn(), marcarActividad: jest.fn() };
    mockMailService = { enviar: jest.fn().mockResolvedValue(true) };
    usuariosCreados = new WeakSet();
    mockManager = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      exists: jest.fn(),
      create: jest.fn((entidad: unknown, datos: object) => {
        const creado = { ...datos };
        if (entidad === Usuario) {
          usuariosCreados.add(creado);
        }
        return creado;
      }),
      save: jest.fn((entidad: object) =>
        Promise.resolve(
          usuariosCreados.has(entidad)
            ? { idUsuario: ID_USUARIO_NUEVO, ...entidad }
            : entidad,
        ),
      ),
      restore: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
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
          provide: getRepositoryToken(RedModulo),
          useValue: mockRedModulosRepository,
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
        { provide: BitacoraService, useValue: mockBitacoraService },
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
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listarComunidades', () => {
    it('debe listar solo comunidades activas e indicar si tienen administración externa', async () => {
      mockRedesRepository.find.mockResolvedValue([
        { idRed: 3, nombre: 'Edificio Andes', tipo: TipoRedVecinal.EDIFICIO },
        { idRed: 5, nombre: 'Villa Copihues', tipo: TipoRedVecinal.VILLA },
      ]);
      mockRedModulosRepository.find.mockResolvedValue([{ idRed: 3 }]);

      const resultado = await target.listarComunidades();

      expect(resultado).toEqual([
        {
          idRed: 3,
          nombre: 'Edificio Andes',
          tipo: TipoRedVecinal.EDIFICIO,
          administracionExterna: true,
        },
        {
          idRed: 5,
          nombre: 'Villa Copihues',
          tipo: TipoRedVecinal.VILLA,
          administracionExterna: false,
        },
      ]);
      expect(mockRedesRepository.find).toHaveBeenCalledWith({
        select: { idRed: true, nombre: true, tipo: true },
        where: { estado: EstadoRedVecinal.ACTIVA },
        order: { nombre: 'ASC' },
      });
      expect(mockRedModulosRepository.find).toHaveBeenCalledWith({
        where: {
          codigoModulo: CodigoModulo.ADMINISTRADOR_EXTERNO,
          activo: true,
        },
      });
    });
  });

  describe('crear', () => {
    const dto = {
      idRed: RED.idRed,
      identificador: '12345678-5',
      nombre: 'Ana',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Soto',
      correo: 'ana@correo.cl',
      numeroUnidad: 'A-101',
    } as CrearSolicitudAccesoDto;

    it('debe guardar la solicitud con país por defecto y la unidad encontrada', async () => {
      mockUnidadesRepository.findOneBy.mockResolvedValue({ idUnidad: 12 });

      const resultado = await target.crear({
        ...dto,
        tipoResidencia: TipoResidencia.ARRENDATARIO,
      });

      expect(resultado).toEqual({ mensaje: MENSAJE_SOLICITUD_RECIBIDA });
      expect(mockRedesRepository.findOneBy).toHaveBeenCalledWith({
        idRed: RED.idRed,
        estado: EstadoRedVecinal.ACTIVA,
      });
      expect(mockSolicitudesRepository.insert).toHaveBeenCalledWith({
        idRed: RED.idRed,
        idUnidad: 12,
        numeroUnidad: 'A-101',
        tipoResidencia: TipoResidencia.ARRENDATARIO,
        identificador: '12345678-5',
        pais: 'CL',
        nombre: 'Ana',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'Soto',
        correo: 'ana@correo.cl',
        telefono: null,
      });
    });

    it('debe guardar idUnidad null cuando el número de unidad no coincide', async () => {
      mockUnidadesRepository.findOneBy.mockResolvedValue(null);

      await target.crear(dto);

      expect(mockSolicitudesRepository.insert).toHaveBeenCalledWith(
        expect.objectContaining({ idUnidad: null }),
      );
    });

    it.each([
      ['ya hay una solicitud pendiente', true, false],
      ['la persona ya es miembro', false, true],
    ])(
      'debe responder lo mismo sin crear otra cuando %s',
      async (_caso, pendiente, miembro) => {
        mockSolicitudesRepository.existsBy.mockResolvedValue(pendiente);
        mockMembresiasRepository.exists.mockResolvedValue(miembro);

        const resultado = await target.crear(dto);

        expect(resultado).toEqual({ mensaje: MENSAJE_SOLICITUD_RECIBIDA });
        expect(mockSolicitudesRepository.insert).not.toHaveBeenCalled();
      },
    );

    it('debe buscar pendientes y miembros vigentes por país e identificador', async () => {
      await target.crear({ ...dto, identificador: '30123456', pais: 'AR' });

      expect(mockSolicitudesRepository.existsBy).toHaveBeenCalledWith({
        idRed: RED.idRed,
        pais: 'AR',
        identificador: '30123456',
        estado: EstadoSolicitudAcceso.PENDIENTE,
      });
      expect(mockMembresiasRepository.exists).toHaveBeenCalledWith({
        where: {
          idRed: RED.idRed,
          activo: true,
          ...condicionVigente(HOY),
          usuario: { pais: 'AR', identificador: '30123456' },
        },
      });
    });

    it('debe lanzar NotFoundException cuando la comunidad no existe o está suspendida', async () => {
      mockRedesRepository.findOneBy.mockResolvedValue(null);

      await expect(target.crear(dto)).rejects.toThrow(
        new NotFoundException('La comunidad no existe'),
      );
      expect(mockSolicitudesRepository.insert).not.toHaveBeenCalled();
    });
  });

  describe('listar', () => {
    it('debe filtrar siempre por la comunidad del administrador', async () => {
      await target.listar(RED, EstadoSolicitudAcceso.PENDIENTE);

      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith({
        where: { idRed: RED.idRed, estado: EstadoSolicitudAcceso.PENDIENTE },
        relations: { unidad: true },
        order: { fechaSolicitud: 'DESC' },
      });
    });

    it('no debe filtrar por estado cuando no se indica', async () => {
      await target.listar(RED);

      expect(mockSolicitudesRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { idRed: RED.idRed } }),
      );
    });
  });

  describe('aprobar', () => {
    it('debe crear la cuenta sin contraseña, el cargo Residente, la residencia, la bitácora y el enlace de activación', async () => {
      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.create).toHaveBeenCalledWith(Usuario, {
        identificador: '12345678-5',
        pais: 'CL',
        nombre: 'Ana',
        apellidoPaterno: 'Pérez',
        apellidoMaterno: 'Soto',
        correo: 'ana@correo.cl',
        telefono: null,
        passwordHash: null,
      });
      expect(insertado(Membresia)).toEqual({
        idUsuario: ID_USUARIO_NUEVO,
        idRed: RED.idRed,
        idRol: RolUsuario.RESIDENTE,
        activo: true,
        desde: HOY,
        hasta: null,
      });
      expect(insertado(Residencia)).toEqual({
        idUsuario: ID_USUARIO_NUEVO,
        idUnidad: 12,
        tipo: TipoResidencia.PROPIETARIO,
        desde: HOY,
        hasta: null,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: RED.idRed,
          idUsuario: ID_RESOLUTOR,
          accion: 'aprobar_solicitud_acceso',
          entidad: 'solicitudes_acceso',
          idEntidad: 80,
          detalle: {
            idUsuario: ID_USUARIO_NUEVO,
            idUnidad: 12,
            tipoResidencia: TipoResidencia.PROPIETARIO,
            cuentaNueva: true,
          },
        },
        mockManager,
      );
      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        ID_USUARIO_NUEVO,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.texto).toContain(
        'http://localhost:5173/restablecer-password?token=token-activacion',
      );
      expect(resultado).toMatchObject({
        estado: EstadoSolicitudAcceso.APROBADA,
        idUsuarioResolutor: ID_RESOLUTOR,
        idUsuarioCreado: ID_USUARIO_NUEVO,
        correoEnviado: true,
      });
    });

    it('debe usar el tipo de residencia corregido por la administración', async () => {
      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {
        tipoResidencia: TipoResidencia.ARRENDATARIO,
      });

      expect(insertado(Residencia)).toMatchObject({
        tipo: TipoResidencia.ARRENDATARIO,
      });
      expect(resultado.tipoResidencia).toBe(TipoResidencia.ARRENDATARIO);
    });

    it('debe informar correoEnviado false cuando el correo de activación no sale', async () => {
      mockMailService.enviar.mockResolvedValue(false);

      const resultado = await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(resultado.correoEnviado).toBe(false);
    });

    it('debe reutilizar la cuenta existente sin emitir token de activación', async () => {
      const existente = crearUsuarioExistente();
      configurarManager({ porIdentificador: existente, porCorreo: existente });

      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.create).not.toHaveBeenCalledWith(
        Usuario,
        expect.anything(),
      );
      expect(insertado(Membresia)).toMatchObject({ idUsuario: 7 });
      expect(mockManager.exists).toHaveBeenCalledWith(Usuario, {
        where: { idUsuario: 7, passwordHash: Not(IsNull()) },
        withDeleted: true,
      });
      expect(mockAuthService.emitirTokenPassword).not.toHaveBeenCalled();
      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.texto).toContain('con tu cuenta actual');
    });

    it('debe enviar el enlace de activación a una cuenta existente que nunca definió contraseña', async () => {
      const sinPassword = crearUsuarioExistente({ fechaEliminacion: AHORA });
      configurarManager({
        porIdentificador: sinPassword,
        porCorreo: sinPassword,
        conPassword: false,
      });

      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockAuthService.emitirTokenPassword).toHaveBeenCalledWith(
        7,
        TipoTokenPassword.ACTIVACION,
        mockManager,
      );
      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.texto).toContain('token=token-activacion');
      expect(correo.texto).not.toContain('con tu cuenta actual');
    });

    it('debe marcar la actividad de la comunidad después de la transacción', async () => {
      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(
        RED.idRed,
      );
      const ordenRegistro =
        mockBitacoraService.registrar.mock.invocationCallOrder[0];
      const ordenActividad =
        mockBitacoraService.marcarActividad.mock.invocationCallOrder[0];
      expect(ordenActividad).toBeGreaterThan(ordenRegistro);
    });

    it('debe lanzar NotFoundException sin enviar correo cuando la comunidad ya no existe', async () => {
      configurarManager({ red: null });

      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new NotFoundException('La comunidad no existe'),
      );
      expect(mockMailService.enviar).not.toHaveBeenCalled();
      expect(mockBitacoraService.marcarActividad).not.toHaveBeenCalled();
    });

    it('debe restaurar una cuenta con borrado lógico', async () => {
      const eliminada = crearUsuarioExistente({ fechaEliminacion: AHORA });
      configurarManager({ porIdentificador: eliminada, porCorreo: eliminada });

      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.restore).toHaveBeenCalledWith(Usuario, {
        idUsuario: 7,
      });
    });

    it('debe lanzar ConflictException sin modificar nada cuando la cuenta está bloqueada', async () => {
      const bloqueada = crearUsuarioExistente({ bloqueado: true });
      configurarManager({ porIdentificador: bloqueada, porCorreo: bloqueada });

      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        ConflictException,
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });

    it('debe restaurar el cargo Residente eliminado y reabrir su periodo desde hoy', async () => {
      const existente = crearUsuarioExistente();
      configurarManager({
        porIdentificador: existente,
        porCorreo: existente,
        residente: {
          idMembresia: 40,
          desde: '2024-01-01',
          hasta: '2024-12-31',
          fechaEliminacion: AHORA,
        },
      });

      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.findOne).toHaveBeenCalledWith(Membresia, {
        where: { idUsuario: 7, idRed: RED.idRed, idRol: RolUsuario.RESIDENTE },
        withDeleted: true,
      });
      expect(mockManager.restore).toHaveBeenCalledWith(Membresia, {
        idMembresia: 40,
      });
      expect(mockManager.update).toHaveBeenCalledWith(
        Membresia,
        { idMembresia: 40 },
        { activo: true, hasta: null, desde: HOY },
      );
      expect(insertado(Membresia)).toBeUndefined();
    });

    it('debe reactivar un cargo Residente vigente sin cambiar su fecha de inicio', async () => {
      const existente = crearUsuarioExistente();
      configurarManager({
        porIdentificador: existente,
        porCorreo: existente,
        residente: {
          idMembresia: 40,
          desde: '2024-01-01',
          hasta: null,
          fechaEliminacion: null,
        },
      });

      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.update).toHaveBeenCalledWith(
        Membresia,
        { idMembresia: 40 },
        { activo: true, hasta: null },
      );
    });

    it.each([
      ['eliminado aunque no vencido', null, AHORA],
      ['vencido aunque no eliminado', '2025-12-31', null],
    ])(
      'debe reabrir desde hoy un cargo Residente %s',
      async (_caso, hasta, fechaEliminacion) => {
        const existente = crearUsuarioExistente();
        configurarManager({
          porIdentificador: existente,
          porCorreo: existente,
          residente: {
            idMembresia: 40,
            desde: '2024-01-01',
            hasta,
            fechaEliminacion,
          },
        });

        await target.aprobar(80, RED, ID_RESOLUTOR, {});

        expect(mockManager.update).toHaveBeenCalledWith(
          Membresia,
          { idMembresia: 40 },
          { activo: true, hasta: null, desde: HOY },
        );
      },
    );

    it('no debe duplicar la residencia cuando la persona ya vive en la unidad', async () => {
      const existente = crearUsuarioExistente();
      configurarManager({
        porIdentificador: existente,
        porCorreo: existente,
        residencia: {
          idResidencia: 60,
          tipo: TipoResidencia.PROPIETARIO,
          hasta: '2027-03-31',
        },
      });

      await target.aprobar(80, RED, ID_RESOLUTOR, {
        tipoResidencia: TipoResidencia.ARRENDATARIO,
      });

      expect(mockManager.findOne).toHaveBeenCalledWith(Residencia, {
        where: {
          idUsuario: 7,
          idUnidad: 12,
          ...condicionVigente(HOY),
        },
      });
      expect(insertado(Residencia)).toBeUndefined();
      expect(mockManager.update).toHaveBeenCalledWith(
        Residencia,
        { idResidencia: 60 },
        { tipo: TipoResidencia.ARRENDATARIO },
      );
    });

    it('no debe tocar la residencia vigente cuando el tipo no cambia', async () => {
      const existente = crearUsuarioExistente();
      configurarManager({
        porIdentificador: existente,
        porCorreo: existente,
        residencia: { idResidencia: 60, tipo: TipoResidencia.PROPIETARIO },
      });

      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(insertado(Residencia)).toBeUndefined();
      expect(mockManager.update).not.toHaveBeenCalledWith(
        Residencia,
        expect.anything(),
        expect.anything(),
      );
    });

    it('debe lanzar ConflictException cuando el correo pertenece a otra persona', async () => {
      configurarManager({
        porCorreo: crearUsuarioExistente({ idUsuario: 9 }),
      });

      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException(
          'El correo de la solicitud ya está registrado por otra persona',
        ),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe buscar al usuario por país e identificador incluyendo eliminados', async () => {
      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.findOne).toHaveBeenCalledWith(Usuario, {
        where: { pais: 'CL', identificador: '12345678-5' },
        withDeleted: true,
      });
    });

    it('debe lanzar BadRequestException cuando la unidad es de otra comunidad', async () => {
      configurarManager({ unidad: null });

      await expect(
        target.aprobar(80, RED, ID_RESOLUTOR, { idUnidad: 99 }),
      ).rejects.toThrow(
        new BadRequestException('La unidad no pertenece a esta comunidad'),
      );
      expect(mockManager.findOneBy).toHaveBeenCalledWith(Unidad, {
        idUnidad: 99,
        idRed: RED.idRed,
      });
    });

    it('debe lanzar BadRequestException cuando no hay unidad detectada ni indicada', async () => {
      configurarManager({ solicitud: crearSolicitud({ idUnidad: null }) });

      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new BadRequestException(
          'No existe la unidad "A-101" en esta comunidad. Indica idUnidad para aprobar.',
        ),
      );
    });

    it('debe buscar la solicitud solo en la comunidad del administrador y bloquearla', async () => {
      await target.aprobar(80, RED, ID_RESOLUTOR, {});

      expect(mockManager.findOne).toHaveBeenCalledWith(SolicitudAcceso, {
        where: { idSolicitud: 80, idRed: RED.idRed },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('debe lanzar NotFoundException cuando la solicitud no existe en la comunidad', async () => {
      configurarManager({ solicitud: null });

      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new NotFoundException('Solicitud no encontrada'),
      );
    });

    it('debe lanzar ConflictException cuando la solicitud ya fue resuelta', async () => {
      configurarManager({
        solicitud: crearSolicitud({ estado: EstadoSolicitudAcceso.APROBADA }),
      });

      await expect(target.aprobar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException('Esta solicitud ya fue resuelta'),
      );
    });
  });

  describe('rechazar', () => {
    it('debe marcar la solicitud como rechazada, registrarla en la bitácora y enviar el motivo', async () => {
      const resultado = await target.rechazar(80, RED, ID_RESOLUTOR, {
        motivo: 'No figura en el registro',
      });

      expect(resultado).toMatchObject({
        estado: EstadoSolicitudAcceso.RECHAZADA,
        motivoRechazo: 'No figura en el registro',
        fechaResolucion: AHORA,
        idUsuarioResolutor: ID_RESOLUTOR,
      });
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: RED.idRed,
          idUsuario: ID_RESOLUTOR,
          accion: 'rechazar_solicitud_acceso',
          entidad: 'solicitudes_acceso',
          idEntidad: 80,
          detalle: { motivo: 'No figura en el registro' },
        },
        mockManager,
      );
      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.texto).toContain('Motivo: No figura en el registro');
      expect(resultado.correoEnviado).toBe(true);
      expect(resultado).not.toHaveProperty('idUsuario');
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(
        RED.idRed,
      );
    });

    it('debe informar correoEnviado false cuando el correo de rechazo no sale', async () => {
      mockMailService.enviar.mockResolvedValue(false);

      const resultado = await target.rechazar(80, RED, ID_RESOLUTOR, {});

      expect(resultado.correoEnviado).toBe(false);
    });

    it('debe guardar motivo null y omitirlo en el correo cuando viene vacío', async () => {
      const resultado = await target.rechazar(80, RED, ID_RESOLUTOR, {
        motivo: '',
      });

      expect(resultado.motivoRechazo).toBeNull();
      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.texto).not.toContain('Motivo:');
    });

    it('debe lanzar NotFoundException sin enviar correo cuando no encuentra la comunidad dentro de la transacción', async () => {
      configurarManager({ red: null });

      await expect(target.rechazar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new NotFoundException('La comunidad no existe'),
      );
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException cuando la solicitud ya fue resuelta', async () => {
      configurarManager({
        solicitud: crearSolicitud({ estado: EstadoSolicitudAcceso.RECHAZADA }),
      });

      await expect(target.rechazar(80, RED, ID_RESOLUTOR, {})).rejects.toThrow(
        new ConflictException('Esta solicitud ya fue resuelta'),
      );
      expect(mockBitacoraService.registrar).not.toHaveBeenCalled();
    });
  });
});

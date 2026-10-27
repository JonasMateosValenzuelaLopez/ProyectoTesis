import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash, createHmac } from 'node:crypto';
import { DataSource, In, IsNull, LessThan, MoreThan } from 'typeorm';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { condicionVigente } from '../common/utils/vigencia';
import { MailService } from '../mail/mail.service';
import {
  EstadoRedVecinal,
  RedVecinal,
  TipoRedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { TipoUnidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import {
  Residencia,
  TipoResidencia,
} from '../usuarios/entities/residencia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  MENSAJE_CODIGO_INVALIDO,
  MENSAJE_CUENTA_BLOQUEADA,
} from './auth.constantes';
import { AuthService } from './auth.service';
import { CodigoOtp } from './entities/codigo-otp.entity';
import {
  TipoTokenPassword,
  TokenPassword,
} from './entities/token-password.entity';

jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => 'hash-falso'),
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const sha256 = (valor: string) =>
  createHash('sha256').update(valor).digest('hex');

const SECRETO = 'secreto-de-prueba';
const hmacCodigo = (idUsuario: number, codigo: string) =>
  createHmac('sha256', SECRETO).update(`${idUsuario}:${codigo}`).digest('hex');

const AHORA = new Date(2026, 9, 26, 12, 0, 0);
const HOY = '2026-10-26';
const UNA_HORA_MS = 60 * 60 * 1000;

describe('AuthService', () => {
  let target: AuthService;
  let mockQueryBuilder: {
    addSelect: jest.Mock;
    where: jest.Mock;
    getOne: jest.Mock;
  };
  let mockUsuariosRepository: {
    createQueryBuilder: jest.Mock;
    findOneBy: jest.Mock;
  };
  let mockMembresiasRepository: { find: jest.Mock };
  let mockResidenciasRepository: { find: jest.Mock };
  let mockRedModulosRepository: { find: jest.Mock };
  let mockCodigosOtpRepository: {
    findOne: jest.Mock;
    update: jest.Mock;
    count: jest.Mock;
  };
  let mockJwtService: { signAsync: jest.Mock };
  let mockMailService: { enviar: jest.Mock; urlFrontend: jest.Mock };
  let mockManager: {
    findOneBy: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
    insert: jest.Mock;
  };
  let mockDataSource: { transaction: jest.Mock; manager: typeof mockManager };

  const crearUsuario = (cambios: Partial<Usuario> = {}): Usuario =>
    ({
      idUsuario: 7,
      identificador: '12345678-5',
      pais: 'CL',
      nombre: 'Ana',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Soto',
      correo: 'ana@correo.cl',
      telefono: '+56911112222',
      passwordHash: 'hash-real',
      passwordActualizadaEn: null,
      esPlataforma: false,
      bloqueado: false,
      motivoBloqueo: null,
      ...cambios,
    }) as Usuario;

  const usuarioSerializado = {
    idUsuario: 7,
    identificador: '12345678-5',
    pais: 'CL',
    nombre: 'Ana',
    apellidoPaterno: 'Pérez',
    apellidoMaterno: 'Soto',
    correo: 'ana@correo.cl',
    telefono: '+56911112222',
    esPlataforma: false,
  };

  const villa = (cambios: Partial<RedVecinal> = {}) =>
    ({
      idRed: 3,
      nombre: 'Villa Los Aromos',
      tipo: TipoRedVecinal.VILLA,
      estado: EstadoRedVecinal.ACTIVA,
      motivoSuspension: null,
      ...cambios,
    }) as RedVecinal;

  const cargo = (
    idRol: RolUsuario,
    nombreRol: string,
    red: RedVecinal | null = villa(),
  ) =>
    ({
      idRed: red?.idRed ?? 3,
      idRol,
      red,
      rol: { idRol, nombreRol },
    }) as Membresia;

  const residenciaEn = (idRed: number, idUnidad: number) =>
    ({
      idUnidad,
      tipo: TipoResidencia.ARRENDATARIO,
      unidad: {
        idUnidad,
        idRed,
        numeroIdentificador: 'A-101',
        tipo: TipoUnidad.CASA,
      },
    }) as Residencia;

  const comunidadVilla = {
    idRed: 3,
    nombre: 'Villa Los Aromos',
    tipo: TipoRedVecinal.VILLA,
    roles: [
      { idRol: RolUsuario.PRESIDENTE, nombre: 'Presidente' },
      { idRol: RolUsuario.RESIDENTE, nombre: 'Residente' },
    ],
    presidenteAdministra: true,
    modulos: [CodigoModulo.MURO, CodigoModulo.COBROS],
    unidades: [
      {
        idUnidad: 12,
        numeroIdentificador: 'A-101',
        tipoUnidad: TipoUnidad.CASA,
        tipoResidencia: TipoResidencia.ARRENDATARIO,
      },
    ],
  };

  const prepararComunidadVilla = () => {
    mockMembresiasRepository.find.mockResolvedValue([
      cargo(RolUsuario.PRESIDENTE, 'Presidente'),
      cargo(RolUsuario.RESIDENTE, 'Residente'),
    ]);
    mockRedModulosRepository.find.mockResolvedValue([
      { idRed: 3, codigoModulo: CodigoModulo.MURO } as RedModulo,
      { idRed: 3, codigoModulo: CodigoModulo.COBROS } as RedModulo,
    ]);
    mockResidenciasRepository.find.mockResolvedValue([
      residenciaEn(3, 12),
      residenciaEn(5, 40),
    ]);
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      addSelect: jest.fn(),
      where: jest.fn(),
      getOne: jest.fn(),
    };
    mockQueryBuilder.addSelect.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);

    mockUsuariosRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOneBy: jest.fn(),
    };
    mockMembresiasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockResidenciasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockRedModulosRepository = { find: jest.fn().mockResolvedValue([]) };
    mockCodigosOtpRepository = {
      findOne: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    mockJwtService = { signAsync: jest.fn() };
    mockMailService = {
      enviar: jest.fn().mockResolvedValue(undefined),
      urlFrontend: jest.fn((ruta: string) => `http://localhost:5173${ruta}`),
    };
    mockManager = {
      findOneBy: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      insert: jest.fn(),
    };
    mockDataSource = {
      transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
        trabajo(mockManager),
      ),
      manager: mockManager,
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuariosRepository,
        },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        {
          provide: getRepositoryToken(Residencia),
          useValue: mockResidenciasRepository,
        },
        {
          provide: getRepositoryToken(RedModulo),
          useValue: mockRedModulosRepository,
        },
        {
          provide: getRepositoryToken(CodigoOtp),
          useValue: mockCodigosOtpRepository,
        },
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: { getOrThrow: () => SECRETO } },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    target = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('login', () => {
    it('debe devolver el token y las comunidades con cargos, módulos y unidades', async () => {
      jest.useFakeTimers({ now: AHORA });
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      prepararComunidadVilla();
      mockJwtService.signAsync.mockResolvedValue('jwt-firmado');

      const resultado = await target.login({
        identificador: '12345678-5',
        password: 'clave1234',
      });

      expect(resultado).toEqual({
        accessToken: 'jwt-firmado',
        tokenType: 'Bearer',
        usuario: { ...usuarioSerializado, comunidades: [comunidadVilla] },
      });
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'usuario.passwordHash',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'usuario.pais = :pais AND usuario.identificador = :identificador',
        { pais: 'CL', identificador: '12345678-5' },
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith('clave1234', 'hash-real');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub: 7 });
      expect(mockMembresiasRepository.find).toHaveBeenCalledWith({
        where: { idUsuario: 7, activo: true, ...condicionVigente(HOY) },
        relations: { red: true, rol: true },
        order: { idRed: 'ASC', idRol: 'ASC' },
      });
      expect(mockRedModulosRepository.find).toHaveBeenCalledWith({
        where: { idRed: In([3]), activo: true },
      });
      expect(mockResidenciasRepository.find).toHaveBeenCalledWith({
        where: { idUsuario: 7, ...condicionVigente(HOY) },
        relations: { unidad: true },
      });
    });

    it('no debe dar administración al Presidente cuando hay administrador externo', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([
        cargo(RolUsuario.PRESIDENTE, 'Presidente'),
      ]);
      mockRedModulosRepository.find.mockResolvedValue([
        {
          idRed: 3,
          codigoModulo: CodigoModulo.ADMINISTRADOR_EXTERNO,
        } as RedModulo,
      ]);

      const resultado = await target.login({
        identificador: '12345678-5',
        password: 'clave1234',
      });

      expect(resultado.usuario.comunidades[0].presidenteAdministra).toBe(false);
    });

    it('debe buscar por correo y país por defecto cuando no viene identificador', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      prepararComunidadVilla();

      await target.login({ correo: 'ana@correo.cl', password: 'clave1234' });

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'usuario.correo = :correo',
        { correo: 'ana@correo.cl' },
      );
    });

    it('debe buscar con el país indicado', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        target.login({
          identificador: '30123456',
          pais: 'AR',
          password: 'clave1234',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'usuario.pais = :pais AND usuario.identificador = :identificador',
        { pais: 'AR', identificador: '30123456' },
      );
    });

    it('debe comparar contra HASH_FALSO y lanzar UnauthorizedException cuando el usuario no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        target.login({ identificador: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'clave1234',
        'hash-falso',
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException cuando la cuenta aún no tiene contraseña', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ passwordHash: null }),
      );
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        target.login({ identificador: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'clave1234',
        'hash-falso',
      );
    });

    it('debe lanzar UnauthorizedException cuando la contraseña es incorrecta', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        target.login({ identificador: '12345678-5', password: 'mala1234' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('debe lanzar ForbiddenException antes de revisar comunidades cuando la cuenta está bloqueada', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ bloqueado: true }),
      );
      mockBcrypt.compare.mockResolvedValue(true as never);

      await expect(
        target.login({ identificador: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(new ForbiddenException(MENSAJE_CUENTA_BLOQUEADA));
      expect(mockMembresiasRepository.find).not.toHaveBeenCalled();
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe dejar entrar al equipo de plataforma sin comunidades', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ esPlataforma: true }),
      );
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValue('jwt-firmado');

      const resultado = await target.login({
        correo: 'equipo@entrecasas.cl',
        password: 'clave1234',
      });

      expect(resultado.usuario).toEqual({
        ...usuarioSerializado,
        esPlataforma: true,
        comunidades: [],
      });
    });

    it('debe explicar la suspensión cuando la única comunidad está suspendida', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([
        cargo(
          RolUsuario.RESIDENTE,
          'Residente',
          villa({
            estado: EstadoRedVecinal.SUSPENDIDA,
            motivoSuspension: 'Deuda con la plataforma',
          }),
        ),
      ]);

      await expect(
        target.login({ identificador: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(
        new ForbiddenException(
          'Tu comunidad Villa Los Aromos está suspendida: Deuda con la plataforma',
        ),
      );
    });

    it('debe dejar entrar con las comunidades activas aunque otra esté suspendida', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([
        cargo(RolUsuario.RESIDENTE, 'Residente'),
        cargo(
          RolUsuario.RESIDENTE,
          'Residente',
          villa({ idRed: 8, estado: EstadoRedVecinal.SUSPENDIDA }),
        ),
      ]);

      const resultado = await target.login({
        identificador: '12345678-5',
        password: 'clave1234',
      });

      expect(resultado.usuario.comunidades.map((c) => c.idRed)).toEqual([3]);
    });

    it('debe lanzar ForbiddenException cuando no tiene comunidades vigentes', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([]);

      await expect(
        target.login({ identificador: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(
        new ForbiddenException(
          'Tu cuenta no está asociada a ninguna comunidad activa.',
        ),
      );
    });

    it('debe omitir las comunidades con borrado lógico', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([
        cargo(RolUsuario.RESIDENTE, 'Residente', null),
      ]);

      await expect(
        target.login({ identificador: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe omitir sin fallar los cargos cuyo rol tiene borrado lógico', async () => {
      prepararComunidadVilla();
      mockMembresiasRepository.find.mockResolvedValue([
        cargo(RolUsuario.PRESIDENTE, 'Presidente'),
        { ...cargo(RolUsuario.RESIDENTE, 'Residente'), rol: null },
      ]);
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwtService.signAsync.mockResolvedValue('jwt-firmado');

      const resultado = await target.login({
        identificador: '12345678-5',
        password: 'clave1234',
      });

      expect(resultado.usuario.comunidades[0].roles).toEqual([
        { idRol: RolUsuario.PRESIDENTE, nombre: 'Presidente' },
      ]);
    });
  });

  describe('solicitarCodigo', () => {
    const mensajeGenerico = {
      mensaje:
        'Si los datos corresponden a una cuenta activa, te enviaremos un código por correo.',
    };

    it('debe anular los códigos previos, guardar solo el HMAC y enviar el código por correo', async () => {
      jest.useFakeTimers({ now: AHORA });
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());

      const resultado = await target.solicitarCodigo({
        identificador: '12345678-5',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockQueryBuilder.addSelect).not.toHaveBeenCalled();
      expect(mockManager.update).toHaveBeenCalledWith(
        CodigoOtp,
        { idUsuario: 7, usado: false },
        { usado: true },
      );
      const [, fila] = mockManager.insert.mock.calls[0];
      expect(fila.expira).toEqual(new Date(AHORA.getTime() + 10 * 60 * 1000));

      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.para).toBe('ana@correo.cl');
      expect(correo.asunto).toBe('Tu código para entrar a EntreCasas');
      const codigo = /(\d{6})/.exec(correo.texto)?.[1] as string;
      expect(fila.codigoHash).toBe(hmacCodigo(7, codigo));
    });

    it('debe contar los códigos emitidos a la cuenta en los últimos 15 minutos', async () => {
      jest.useFakeTimers({ now: AHORA });
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());

      await target.solicitarCodigo({ identificador: '12345678-5' });

      expect(mockCodigosOtpRepository.count).toHaveBeenCalledWith({
        where: {
          idUsuario: 7,
          expira: MoreThan(new Date(AHORA.getTime() - 5 * 60 * 1000)),
        },
      });
    });

    it('debe responder lo mismo sin anular el código vigente cuando la cuenta alcanzó el límite', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockCodigosOtpRepository.count.mockResolvedValue(3);
      const espiaWarn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      const resultado = await target.solicitarCodigo({
        identificador: '12345678-5',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
      expect(espiaWarn).toHaveBeenCalledWith(
        'Límite de códigos de acceso alcanzado para el usuario 7',
      );
      espiaWarn.mockRestore();
    });

    it.each([
      ['no existe', null],
      ['está bloqueada', crearUsuario({ bloqueado: true })],
    ])(
      'debe responder lo mismo sin enviar nada cuando la cuenta %s',
      async (_caso, usuario) => {
        mockQueryBuilder.getOne.mockResolvedValue(usuario);

        const resultado = await target.solicitarCodigo({
          identificador: '12345678-5',
        });

        expect(resultado).toEqual(mensajeGenerico);
        expect(mockManager.insert).not.toHaveBeenCalled();
        expect(mockMailService.enviar).not.toHaveBeenCalled();
      },
    );

    it('debe responder lo mismo sin enviar correo cuando falla la BD', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockManager.insert.mockRejectedValue(new Error('BD caída'));
      const espiaError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const resultado = await target.solicitarCodigo({
        identificador: '12345678-5',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockMailService.enviar).not.toHaveBeenCalled();
      expect(espiaError).toHaveBeenCalledWith(
        'No se pudo emitir el código de acceso del usuario 7',
        expect.any(String),
      );
      espiaError.mockRestore();
    });
  });

  describe('verificarCodigo', () => {
    const registro = {
      idCodigo: 90,
      idUsuario: 7,
      codigoHash: hmacCodigo(7, '123456'),
      usado: false,
      intentos: 0,
    } as CodigoOtp;

    beforeEach(() => {
      jest.useFakeTimers({ now: AHORA });
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockCodigosOtpRepository.findOne.mockResolvedValue(registro);
      mockCodigosOtpRepository.update.mockResolvedValue({ affected: 1 });
    });

    it('debe descontar el intento, consumir el código y emitir la sesión', async () => {
      prepararComunidadVilla();
      mockJwtService.signAsync.mockResolvedValue('jwt-firmado');

      const resultado = await target.verificarCodigo({
        identificador: '12345678-5',
        codigo: '123456',
      });

      expect(resultado.accessToken).toBe('jwt-firmado');
      expect(mockCodigosOtpRepository.findOne).toHaveBeenCalledWith({
        where: { idUsuario: 7, usado: false, expira: MoreThan(AHORA) },
        order: { idCodigo: 'DESC' },
      });
      expect(mockCodigosOtpRepository.update).toHaveBeenNthCalledWith(
        1,
        { idCodigo: 90, usado: false, intentos: LessThan(5) },
        { intentos: expect.any(Function) },
      );
      const [, { intentos }] = mockCodigosOtpRepository.update.mock.calls[0];
      expect(intentos()).toBe('intentos + 1');
      expect(mockCodigosOtpRepository.update).toHaveBeenNthCalledWith(
        2,
        { idCodigo: 90, usado: false },
        { usado: true },
      );
    });

    it('debe rechazar el código correcto de otra cuenta porque el HMAC incluye al usuario', async () => {
      mockCodigosOtpRepository.findOne.mockResolvedValue({
        ...registro,
        codigoHash: hmacCodigo(8, '123456'),
      });

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('El código no es válido o ya expiró'),
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe rechazar sin lanzar RangeError cuando el hash guardado tiene otro largo', async () => {
      mockCodigosOtpRepository.findOne.mockResolvedValue({
        ...registro,
        codigoHash: 'abcd',
      });

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('El código no es válido o ya expiró'),
      );
    });

    it('debe lanzar UnauthorizedException sin consumir el código cuando es incorrecto', async () => {
      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '654321',
        }),
      ).rejects.toThrow(new UnauthorizedException(MENSAJE_CODIGO_INVALIDO));
      expect(mockCodigosOtpRepository.update).toHaveBeenCalledTimes(1);
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe anular el código cuando se agotaron los intentos, aunque el código sea correcto', async () => {
      mockCodigosOtpRepository.update
        .mockResolvedValueOnce({ affected: 0 })
        .mockResolvedValueOnce({ affected: 1 });

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(new UnauthorizedException(MENSAJE_CODIGO_INVALIDO));
      expect(mockCodigosOtpRepository.update).toHaveBeenLastCalledWith(
        { idCodigo: 90 },
        { usado: true },
      );
    });

    it('debe rechazar cuando otra petición consumió el código primero', async () => {
      mockCodigosOtpRepository.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(new UnauthorizedException(MENSAJE_CODIGO_INVALIDO));
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException cuando no hay código vigente', async () => {
      mockCodigosOtpRepository.findOne.mockResolvedValue(null);

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(new UnauthorizedException(MENSAJE_CODIGO_INVALIDO));
      expect(mockCodigosOtpRepository.update).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException cuando el usuario no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(new UnauthorizedException(MENSAJE_CODIGO_INVALIDO));
      expect(mockCodigosOtpRepository.findOne).not.toHaveBeenCalled();
    });

    it('debe aplicar las reglas del login: cuenta bloqueada', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ bloqueado: true }),
      );

      await expect(
        target.verificarCodigo({
          identificador: '12345678-5',
          codigo: '123456',
        }),
      ).rejects.toThrow(new ForbiddenException(MENSAJE_CUENTA_BLOQUEADA));
    });
  });

  describe('perfil', () => {
    it('debe devolver los datos del usuario con sus comunidades', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(crearUsuario());
      prepararComunidadVilla();

      const resultado = await target.perfil(7);

      expect(resultado).toEqual({
        ...usuarioSerializado,
        comunidades: [comunidadVilla],
      });
      expect(mockUsuariosRepository.findOneBy).toHaveBeenCalledWith({
        idUsuario: 7,
      });
    });

    it('debe lanzar NotFoundException cuando el usuario no existe', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(null);

      await expect(target.perfil(99)).rejects.toThrow(
        new NotFoundException('Usuario no encontrado'),
      );
    });
  });

  describe('solicitarRecuperacion', () => {
    const mensajeGenerico = {
      mensaje:
        'Si los datos corresponden a una cuenta activa, te enviaremos un correo con instrucciones.',
    };

    it('debe emitir un token de recuperación y enviar el correo cuando la cuenta está activa', async () => {
      jest.useFakeTimers({ now: AHORA });
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());

      const resultado = await target.solicitarRecuperacion({
        correo: 'ana@correo.cl',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockQueryBuilder.addSelect).not.toHaveBeenCalled();
      expect(mockManager.softDelete).toHaveBeenCalledWith(TokenPassword, {
        idUsuario: 7,
        tipo: TipoTokenPassword.RECUPERACION,
        fechaUso: IsNull(),
      });
      const [, filaInsertada] = mockManager.insert.mock.calls[0];
      expect(filaInsertada.fechaExpiracion).toEqual(
        new Date(AHORA.getTime() + UNA_HORA_MS),
      );

      expect(mockMailService.enviar).toHaveBeenCalledTimes(1);
      const [correo] = mockMailService.enviar.mock.calls[0];
      expect(correo.para).toBe('ana@correo.cl');
      expect(correo.asunto).toBe('Recupera tu contraseña de EntreCasas');
      const tokenEnCorreo = /token=([\w-]+)/.exec(correo.texto)?.[1] as string;
      expect(sha256(tokenEnCorreo)).toBe(filaInsertada.tokenHash);
    });

    it('debe responder lo mismo sin enviar correo cuando el usuario no existe', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(null);

      const resultado = await target.solicitarRecuperacion({
        identificador: '12345678-5',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe responder lo mismo sin enviar correo cuando la cuenta está bloqueada', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ bloqueado: true }),
      );

      const resultado = await target.solicitarRecuperacion({
        identificador: '12345678-5',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe emitir el token dentro de una transacción propia', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());

      await target.solicitarRecuperacion({ correo: 'ana@correo.cl' });

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('debe responder lo mismo sin enviar correo cuando falla la emisión del token', async () => {
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockManager.insert.mockRejectedValue(new Error('BD caída'));
      const espiaError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const resultado = await target.solicitarRecuperacion({
        correo: 'ana@correo.cl',
      });

      expect(resultado).toEqual(mensajeGenerico);
      expect(mockMailService.enviar).not.toHaveBeenCalled();
      expect(espiaError).toHaveBeenCalledWith(
        'No se pudo emitir el token de recuperación del usuario 7',
        expect.any(String),
      );
      espiaError.mockRestore();
    });
  });

  describe('restablecerPassword', () => {
    const dto = {
      token: 'token-en-claro-de-prueba-123',
      password: 'nueva1234',
    };
    const tokenGuardado = {
      idToken: 50,
      idUsuario: 7,
      fechaExpiracion: new Date(AHORA.getTime() + UNA_HORA_MS),
      fechaUso: null,
    };

    beforeEach(() => {
      jest.useFakeTimers({ now: AHORA });
      mockBcrypt.hash.mockResolvedValue('hash-nuevo' as never);
    });

    it('debe marcar el token como usado, actualizar la contraseña y borrar los demás tokens pendientes', async () => {
      mockManager.findOneBy.mockResolvedValue(tokenGuardado);
      mockManager.update.mockResolvedValue({ affected: 1 });

      const resultado = await target.restablecerPassword(dto);

      expect(resultado).toEqual({
        mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.',
      });
      expect(mockBcrypt.hash).toHaveBeenCalledWith('nueva1234', 10);
      expect(mockManager.findOneBy).toHaveBeenCalledWith(TokenPassword, {
        tokenHash: sha256(dto.token),
        fechaUso: IsNull(),
      });
      expect(mockManager.update).toHaveBeenNthCalledWith(
        1,
        TokenPassword,
        { idToken: 50, fechaUso: IsNull() },
        { fechaUso: AHORA },
      );
      expect(mockManager.update).toHaveBeenNthCalledWith(
        2,
        Usuario,
        { idUsuario: 7, fechaEliminacion: IsNull() },
        { passwordHash: 'hash-nuevo', passwordActualizadaEn: AHORA },
      );
      expect(mockManager.softDelete).toHaveBeenCalledWith(TokenPassword, {
        idUsuario: 7,
        fechaUso: IsNull(),
      });
    });

    it('debe tratar como enlace inválido el token de una cuenta eliminada', async () => {
      mockManager.findOneBy.mockResolvedValue(tokenGuardado);
      mockManager.update
        .mockResolvedValueOnce({ affected: 1 })
        .mockResolvedValueOnce({ affected: 0 });

      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.softDelete).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException cuando el token no existe o ya se usó', async () => {
      mockManager.findOneBy.mockResolvedValue(null);

      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException cuando el token expiró', async () => {
      mockManager.findOneBy.mockResolvedValue({
        ...tokenGuardado,
        fechaExpiracion: new Date(AHORA.getTime() - 1),
      });

      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException sin cambiar la contraseña cuando otra petición usó el token primero', async () => {
      mockManager.findOneBy.mockResolvedValue(tokenGuardado);
      mockManager.update.mockResolvedValue({ affected: 0 });

      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockManager.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('emitirTokenPassword', () => {
    it('debe reemplazar tokens previos y guardar solo el hash con vigencia de 3 días para activación', async () => {
      jest.useFakeTimers({ now: AHORA });
      const mockManagerExterno = { softDelete: jest.fn(), insert: jest.fn() };

      const token = await target.emitirTokenPassword(
        7,
        TipoTokenPassword.ACTIVACION,
        mockManagerExterno as never,
      );

      expect(token).toMatch(/^[\w-]{43}$/);
      expect(mockManagerExterno.softDelete).toHaveBeenCalledWith(
        TokenPassword,
        {
          idUsuario: 7,
          tipo: TipoTokenPassword.ACTIVACION,
          fechaUso: IsNull(),
        },
      );
      expect(mockManagerExterno.insert).toHaveBeenCalledWith(TokenPassword, {
        idUsuario: 7,
        tipo: TipoTokenPassword.ACTIVACION,
        tokenHash: sha256(token),
        fechaExpiracion: new Date(AHORA.getTime() + 72 * UNA_HORA_MS),
      });
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('debe generar un token distinto en cada llamada', async () => {
      const primero = await target.emitirTokenPassword(
        7,
        TipoTokenPassword.RECUPERACION,
      );
      const segundo = await target.emitirTokenPassword(
        7,
        TipoTokenPassword.RECUPERACION,
      );

      expect(primero).not.toBe(segundo);
    });
  });

  describe('urlRestablecer', () => {
    it('debe armar el enlace del frontend con el token', () => {
      const url = target.urlRestablecer('abc123');

      expect(url).toBe(
        'http://localhost:5173/restablecer-password?token=abc123',
      );
      expect(mockMailService.urlFrontend).toHaveBeenCalledWith(
        '/restablecer-password?token=abc123',
      );
    });
  });
});

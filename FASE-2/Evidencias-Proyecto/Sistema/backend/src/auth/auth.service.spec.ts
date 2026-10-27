import {
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { DataSource, IsNull } from 'typeorm';
import { TipoRedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { MailService } from '../mail/mail.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AuthService } from './auth.service';
import {
  TipoTokenPassword,
  TokenPassword,
} from './entities/token-password.entity';

// bcrypt real tarda ~100 ms por hash; se simula para controlar el resultado
// de compare y para poder verificar el uso de HASH_FALSO.
jest.mock('bcryptjs', () => ({
  hashSync: jest.fn(() => 'hash-falso'),
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

const sha256 = (valor: string) =>
  createHash('sha256').update(valor).digest('hex');

const AHORA = new Date('2026-10-26T12:00:00.000Z');
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
      rut: '12345678-5',
      nombre: 'Ana',
      apellidoPaterno: 'Pérez',
      apellidoMaterno: 'Soto',
      correo: 'ana@correo.cl',
      telefono: '+56911112222',
      passwordHash: 'hash-real',
      passwordActualizadaEn: null,
      estado: true,
      membresias: [],
      ...cambios,
    }) as Usuario;

  const usuarioSerializado = {
    idUsuario: 7,
    rut: '12345678-5',
    nombre: 'Ana',
    apellidoPaterno: 'Pérez',
    apellidoMaterno: 'Soto',
    correo: 'ana@correo.cl',
    telefono: '+56911112222',
  };

  const membresiaConUnidad = {
    idRed: 3,
    red: { nombre: 'Villa Los Aromos', tipo: TipoRedVecinal.VILLA },
    unidad: {
      idUnidad: 12,
      numeroIdentificador: 'A-101',
      callePasaje: 'Los Olmos',
    },
    roles: [{ idRol: 6, nombreRol: 'Residente' }],
  };

  const comunidadConUnidad = {
    idRed: 3,
    nombre: 'Villa Los Aromos',
    tipo: TipoRedVecinal.VILLA,
    unidad: {
      idUnidad: 12,
      numeroIdentificador: 'A-101',
      callePasaje: 'Los Olmos',
    },
    roles: [{ idRol: 6, nombre: 'Residente' }],
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
    mockMembresiasRepository = { find: jest.fn() };
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
        { provide: JwtService, useValue: mockJwtService },
        { provide: MailService, useValue: mockMailService },
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
    it('debe devolver el token y las comunidades cuando las credenciales son correctas', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([membresiaConUnidad]);
      mockJwtService.signAsync.mockResolvedValue('jwt-firmado');

      // Act
      const resultado = await target.login({
        rut: '12.345.678-5',
        password: 'clave1234',
      });

      // Assert
      expect(resultado).toEqual({
        accessToken: 'jwt-firmado',
        tokenType: 'Bearer',
        usuario: { ...usuarioSerializado, comunidades: [comunidadConUnidad] },
      });
      expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith(
        'usuario.passwordHash',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'usuario.rut = :rut',
        {
          rut: '12345678-5',
        },
      );
      expect(mockBcrypt.compare).toHaveBeenCalledWith('clave1234', 'hash-real');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith({ sub: 7 });
      expect(mockMembresiasRepository.find).toHaveBeenCalledWith({
        where: { idUsuario: 7, estado: true },
        relations: { red: true, unidad: true, roles: true },
        order: { idRed: 'ASC' },
      });
    });

    it('debe buscar por correo cuando no viene RUT', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([membresiaConUnidad]);

      // Act
      await target.login({ correo: 'ana@correo.cl', password: 'clave1234' });

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'usuario.correo = :correo',
        { correo: 'ana@correo.cl' },
      );
    });

    it('debe devolver unidad null en la comunidad cuando la membresía no tiene unidad', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([
        { ...membresiaConUnidad, unidad: null },
      ]);

      // Act
      const resultado = await target.login({
        rut: '12345678-5',
        password: 'clave1234',
      });

      // Assert
      expect(resultado.usuario.comunidades).toEqual([
        { ...comunidadConUnidad, unidad: null },
      ]);
    });

    it('debe comparar contra HASH_FALSO y lanzar UnauthorizedException cuando el usuario no existe', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        target.login({ rut: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
      expect(mockBcrypt.compare).toHaveBeenCalledWith(
        'clave1234',
        'hash-falso',
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException cuando la contraseña es incorrecta', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(false as never);

      // Act & Assert
      await expect(
        target.login({ rut: '12345678-5', password: 'otra-clave1' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando la cuenta está desactivada', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ estado: false }),
      );
      mockBcrypt.compare.mockResolvedValue(true as never);

      // Act & Assert
      await expect(
        target.login({ rut: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(
        new ForbiddenException(
          'Tu cuenta está desactivada. Contacta a la administración.',
        ),
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando el usuario no tiene comunidades activas', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockMembresiasRepository.find.mockResolvedValue([]);

      // Act & Assert
      await expect(
        target.login({ rut: '12345678-5', password: 'clave1234' }),
      ).rejects.toThrow(
        new ForbiddenException(
          'Tu cuenta no está asociada a ninguna comunidad activa.',
        ),
      );
      expect(mockJwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('perfil', () => {
    it('debe devolver los datos del usuario con sus comunidades', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(crearUsuario());
      mockMembresiasRepository.find.mockResolvedValue([membresiaConUnidad]);

      // Act
      const resultado = await target.perfil(7);

      // Assert
      expect(resultado).toEqual({
        ...usuarioSerializado,
        comunidades: [comunidadConUnidad],
      });
      expect(mockUsuariosRepository.findOneBy).toHaveBeenCalledWith({
        idUsuario: 7,
      });
    });

    it('debe omitir las comunidades con borrado lógico', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(crearUsuario());
      mockMembresiasRepository.find.mockResolvedValue([
        { ...membresiaConUnidad, idRed: 5, red: null },
        membresiaConUnidad,
      ]);

      // Act
      const resultado = await target.perfil(7);

      // Assert
      expect(resultado.comunidades).toEqual([comunidadConUnidad]);
    });

    it('debe lanzar NotFoundException cuando el usuario no existe', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
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
      // Arrange
      jest.useFakeTimers({ now: AHORA });
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());

      // Act
      const resultado = await target.solicitarRecuperacion({
        correo: 'ana@correo.cl',
      });

      // Assert
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
      // El enlace del correo lleva el token en claro, cuyo hash es el guardado.
      const tokenEnCorreo = /token=([\w-]+)/.exec(correo.texto)?.[1] as string;
      expect(sha256(tokenEnCorreo)).toBe(filaInsertada.tokenHash);
    });

    it('debe responder lo mismo sin enviar correo cuando el usuario no existe', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(null);

      // Act
      const resultado = await target.solicitarRecuperacion({
        rut: '12345678-5',
      });

      // Assert
      expect(resultado).toEqual(mensajeGenerico);
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe responder lo mismo sin enviar correo cuando la cuenta está desactivada', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(
        crearUsuario({ estado: false }),
      );

      // Act
      const resultado = await target.solicitarRecuperacion({
        rut: '12345678-5',
      });

      // Assert
      expect(resultado).toEqual(mensajeGenerico);
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockMailService.enviar).not.toHaveBeenCalled();
    });

    it('debe emitir el token dentro de una transacción propia', async () => {
      // Arrange
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());

      // Act
      await target.solicitarRecuperacion({ correo: 'ana@correo.cl' });

      // Assert
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('debe responder lo mismo sin enviar correo cuando falla la emisión del token', async () => {
      // Arrange: un 500 solo para cuentas existentes revelaría cuáles existen.
      mockQueryBuilder.getOne.mockResolvedValue(crearUsuario());
      mockManager.insert.mockRejectedValue(new Error('BD caída'));
      const espiaError = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      // Act
      const resultado = await target.solicitarRecuperacion({
        correo: 'ana@correo.cl',
      });

      // Assert
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
      // Arrange
      mockManager.findOneBy.mockResolvedValue(tokenGuardado);
      mockManager.update.mockResolvedValue({ affected: 1 });

      // Act
      const resultado = await target.restablecerPassword(dto);

      // Assert
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
        { idUsuario: 7 },
        { passwordHash: 'hash-nuevo', passwordActualizadaEn: AHORA },
      );
      expect(mockManager.softDelete).toHaveBeenCalledWith(TokenPassword, {
        idUsuario: 7,
        fechaUso: IsNull(),
      });
    });

    it('debe lanzar BadRequestException cuando el token no existe o ya se usó', async () => {
      // Arrange
      mockManager.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException cuando el token expiró', async () => {
      // Arrange
      mockManager.findOneBy.mockResolvedValue({
        ...tokenGuardado,
        fechaExpiracion: new Date(AHORA.getTime() - 1),
      });

      // Act & Assert
      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
    });

    it('debe lanzar BadRequestException sin cambiar la contraseña cuando otra petición usó el token primero', async () => {
      // Arrange
      mockManager.findOneBy.mockResolvedValue(tokenGuardado);
      mockManager.update.mockResolvedValue({ affected: 0 });

      // Act & Assert
      await expect(target.restablecerPassword(dto)).rejects.toThrow(
        new BadRequestException('El enlace no es válido o ya expiró'),
      );
      expect(mockManager.update).toHaveBeenCalledTimes(1);
      expect(mockManager.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('emitirTokenPassword', () => {
    it('debe reemplazar tokens previos y guardar solo el hash con vigencia de 3 días para activación', async () => {
      // Arrange
      jest.useFakeTimers({ now: AHORA });
      const mockManagerExterno = { softDelete: jest.fn(), insert: jest.fn() };

      // Act
      const token = await target.emitirTokenPassword(
        7,
        TipoTokenPassword.ACTIVACION,
        mockManagerExterno as never,
      );

      // Assert
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
      // Act
      const primero = await target.emitirTokenPassword(
        7,
        TipoTokenPassword.RECUPERACION,
      );
      const segundo = await target.emitirTokenPassword(
        7,
        TipoTokenPassword.RECUPERACION,
      );

      // Assert
      expect(primero).not.toBe(segundo);
    });
  });

  describe('urlRestablecer', () => {
    it('debe armar el enlace del frontend con el token', () => {
      // Act
      const url = target.urlRestablecer('abc123');

      // Assert
      expect(url).toBe(
        'http://localhost:5173/restablecer-password?token=abc123',
      );
      expect(mockMailService.urlFrontend).toHaveBeenCalledWith(
        '/restablecer-password?token=abc123',
      );
    });
  });
});

import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { JwtStrategy } from './jwt.strategy';

const CAMBIO_PASSWORD = new Date('2026-10-26T12:00:00.500Z');
const SEGUNDO_CAMBIO = Math.floor(CAMBIO_PASSWORD.getTime() / 1000);

describe('JwtStrategy', () => {
  let target: JwtStrategy;
  let mockUsuariosRepository: { findOneBy: jest.Mock };

  const crearUsuario = (cambios: Partial<Usuario> = {}) =>
    ({
      idUsuario: 7,
      estado: true,
      passwordActualizadaEn: null,
      ...cambios,
    }) as Usuario;

  beforeEach(async () => {
    mockUsuariosRepository = { findOneBy: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn(() => 'secreto-de-prueba') },
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuariosRepository,
        },
      ],
    }).compile();

    target = module.get(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('debe devolver solo el idUsuario cuando el usuario está activo', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordHash: 'hash' } as Partial<Usuario>),
      );

      // Act
      const resultado = await target.validate({ sub: 7, iat: 100 });

      // Assert
      expect(resultado).toEqual({ idUsuario: 7 });
      expect(mockUsuariosRepository.findOneBy).toHaveBeenCalledWith({
        idUsuario: 7,
      });
    });

    it('debe lanzar UnauthorizedException cuando el usuario no existe', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(null);

      // Act & Assert
      await expect(target.validate({ sub: 99, iat: 100 })).rejects.toThrow(
        new UnauthorizedException('Sesión inválida'),
      );
    });

    it('debe lanzar UnauthorizedException cuando el usuario está desactivado', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ estado: false }),
      );

      // Act & Assert
      await expect(target.validate({ sub: 7, iat: 100 })).rejects.toThrow(
        new UnauthorizedException('Sesión inválida'),
      );
    });

    it.each([
      ['ausente', undefined],
      ['cero', 0],
      ['negativo', -1],
      ['decimal', 1.5],
      ['texto', '7'],
    ])(
      'debe lanzar UnauthorizedException sin consultar la BD cuando sub es %s',
      async (_caso, sub) => {
        // Act & Assert
        await expect(
          target.validate({ sub, iat: 100 } as unknown as JwtPayload),
        ).rejects.toThrow(new UnauthorizedException('Sesión inválida'));
        expect(mockUsuariosRepository.findOneBy).not.toHaveBeenCalled();
      },
    );

    it('debe lanzar UnauthorizedException cuando el token es anterior al cambio de contraseña', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordActualizadaEn: CAMBIO_PASSWORD }),
      );

      // Act & Assert
      await expect(
        target.validate({ sub: 7, iat: SEGUNDO_CAMBIO - 1 }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Tu contraseña cambió. Inicia sesión nuevamente.',
        ),
      );
    });

    it('debe aceptar un token emitido en el mismo segundo del cambio de contraseña', async () => {
      // Arrange: iat tiene resolución de segundos; el login justo después del
      // restablecimiento no debe quedar rechazado.
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordActualizadaEn: CAMBIO_PASSWORD }),
      );

      // Act
      const resultado = await target.validate({
        sub: 7,
        iat: SEGUNDO_CAMBIO,
      });

      // Assert
      expect(resultado).toEqual({ idUsuario: 7 });
    });

    it('debe rechazar un token sin iat cuando la contraseña ya fue cambiada', async () => {
      // Arrange
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordActualizadaEn: CAMBIO_PASSWORD }),
      );

      // Act & Assert
      await expect(target.validate({ sub: 7 })).rejects.toThrow(
        new UnauthorizedException(
          'Tu contraseña cambió. Inicia sesión nuevamente.',
        ),
      );
    });
  });
});

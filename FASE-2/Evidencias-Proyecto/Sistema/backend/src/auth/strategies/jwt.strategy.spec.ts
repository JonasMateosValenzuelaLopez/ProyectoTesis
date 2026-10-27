import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { MENSAJE_CUENTA_BLOQUEADA } from '../auth.constantes';
import { JwtStrategy } from './jwt.strategy';

const CAMBIO_PASSWORD = new Date('2026-10-26T12:00:00.500Z');
const SEGUNDO_CAMBIO = Math.floor(CAMBIO_PASSWORD.getTime() / 1000);

describe('JwtStrategy', () => {
  let target: JwtStrategy;
  let mockUsuariosRepository: { findOneBy: jest.Mock };

  const crearUsuario = (cambios: Partial<Usuario> = {}) =>
    ({
      idUsuario: 7,
      esPlataforma: false,
      bloqueado: false,
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
    it('debe devolver el idUsuario y si es de plataforma cuando la cuenta está habilitada', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordHash: 'hash' } as Partial<Usuario>),
      );

      const resultado = await target.validate({ sub: 7, iat: 100 });

      expect(resultado).toEqual({ idUsuario: 7, esPlataforma: false });
      expect(mockUsuariosRepository.findOneBy).toHaveBeenCalledWith({
        idUsuario: 7,
      });
    });

    it('debe lanzar UnauthorizedException cuando el usuario no existe', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(null);

      await expect(target.validate({ sub: 99, iat: 100 })).rejects.toThrow(
        new UnauthorizedException('Sesión inválida'),
      );
    });

    it('debe lanzar ForbiddenException cuando la cuenta está bloqueada', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ bloqueado: true }),
      );

      await expect(target.validate({ sub: 7, iat: 100 })).rejects.toThrow(
        new ForbiddenException(MENSAJE_CUENTA_BLOQUEADA),
      );
    });

    it('debe marcar al equipo de plataforma', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ esPlataforma: true }),
      );

      const resultado = await target.validate({ sub: 7, iat: 100 });

      expect(resultado).toEqual({ idUsuario: 7, esPlataforma: true });
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
        await expect(
          target.validate({ sub, iat: 100 } as unknown as JwtPayload),
        ).rejects.toThrow(new UnauthorizedException('Sesión inválida'));
        expect(mockUsuariosRepository.findOneBy).not.toHaveBeenCalled();
      },
    );

    it('debe lanzar UnauthorizedException cuando el token es anterior al cambio de contraseña', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordActualizadaEn: CAMBIO_PASSWORD }),
      );

      await expect(
        target.validate({ sub: 7, iat: SEGUNDO_CAMBIO - 1 }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Tu contraseña cambió. Inicia sesión nuevamente.',
        ),
      );
    });

    it('debe aceptar un token emitido en el mismo segundo del cambio de contraseña', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordActualizadaEn: CAMBIO_PASSWORD }),
      );

      const resultado = await target.validate({
        sub: 7,
        iat: SEGUNDO_CAMBIO,
      });

      expect(resultado).toEqual({ idUsuario: 7, esPlataforma: false });
    });

    it('debe rechazar un token sin iat cuando la contraseña ya fue cambiada', async () => {
      mockUsuariosRepository.findOneBy.mockResolvedValue(
        crearUsuario({ passwordActualizadaEn: CAMBIO_PASSWORD }),
      );

      await expect(target.validate({ sub: 7 })).rejects.toThrow(
        new UnauthorizedException(
          'Tu contraseña cambió. Inicia sesión nuevamente.',
        ),
      );
    });
  });
});

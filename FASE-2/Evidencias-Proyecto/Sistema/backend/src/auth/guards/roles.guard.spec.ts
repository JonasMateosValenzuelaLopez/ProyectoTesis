import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolUsuario } from '../../common/enums/rol.enum';
import { Membresia } from '../../usuarios/entities/membresia.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

type RequestFalso = {
  user?: { idUsuario: number };
  header: jest.Mock;
  red?: unknown;
};

describe('RolesGuard', () => {
  let target: RolesGuard;
  let mockMembresiasRepository: jest.Mocked<
    Pick<Repository<Membresia>, 'findOne'>
  >;
  let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const handler = () => undefined;
  class ControladorFalso {}

  const crearRequest = (
    idRedHeader: string | undefined,
    user: RequestFalso['user'] = { idUsuario: 7 },
  ): RequestFalso => ({
    user,
    header: jest.fn().mockReturnValue(idRedHeader),
  });

  const crearContexto = (request: RequestFalso) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
      getClass: () => ControladorFalso,
    }) as unknown as ExecutionContext;

  const crearMembresia = (roles: RolUsuario[]) =>
    ({
      idMembresia: 30,
      idUsuario: 7,
      idRed: 3,
      idUnidad: 12,
      estado: true,
      red: { idRed: 3, nombre: 'Villa Los Aromos' },
      roles: roles.map((idRol) => ({ idRol, nombreRol: `rol-${idRol}` })),
    }) as Membresia;

  beforeEach(async () => {
    mockMembresiasRepository = { findOne: jest.fn() };
    mockReflector = { getAllAndOverride: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
      ],
    }).compile();

    target = module.get(RolesGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('debe permitir el acceso y dejar el contexto de la red cuando la ruta no exige roles', async () => {
      // Arrange
      const request = crearRequest('3');
      mockMembresiasRepository.findOne.mockResolvedValue(
        crearMembresia([RolUsuario.RESIDENTE]),
      );
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      // Act
      const resultado = await target.canActivate(crearContexto(request));

      // Assert
      expect(resultado).toBe(true);
      expect(request.red).toEqual({
        idRed: 3,
        idMembresia: 30,
        idUnidad: 12,
        roles: [RolUsuario.RESIDENTE],
      });
      expect(request.header).toHaveBeenCalledWith('x-red-id');
      expect(mockMembresiasRepository.findOne).toHaveBeenCalledWith({
        where: { idUsuario: 7, idRed: 3, estado: true },
        relations: { roles: true, red: true },
      });
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        handler,
        ControladorFalso,
      ]);
    });

    it('debe permitir el acceso cuando el usuario tiene alguno de los roles exigidos', async () => {
      // Arrange
      const request = crearRequest('3');
      mockMembresiasRepository.findOne.mockResolvedValue(
        crearMembresia([RolUsuario.RESIDENTE, RolUsuario.TESORERO]),
      );
      mockReflector.getAllAndOverride.mockReturnValue([
        RolUsuario.ADMINISTRACION,
        RolUsuario.TESORERO,
      ]);

      // Act
      const resultado = await target.canActivate(crearContexto(request));

      // Assert
      expect(resultado).toBe(true);
    });

    it('debe permitir el acceso cuando @Roles viene vacío', async () => {
      // Arrange
      mockMembresiasRepository.findOne.mockResolvedValue(crearMembresia([]));
      mockReflector.getAllAndOverride.mockReturnValue([]);

      // Act
      const resultado = await target.canActivate(
        crearContexto(crearRequest('3')),
      );

      // Assert
      expect(resultado).toBe(true);
    });

    it('debe lanzar ForbiddenException cuando el usuario no tiene ninguno de los roles exigidos', async () => {
      // Arrange
      mockMembresiasRepository.findOne.mockResolvedValue(
        crearMembresia([RolUsuario.RESIDENTE]),
      );
      mockReflector.getAllAndOverride.mockReturnValue([
        RolUsuario.ADMINISTRACION,
      ]);

      // Act & Assert
      await expect(
        target.canActivate(crearContexto(crearRequest('3'))),
      ).rejects.toThrow(
        new ForbiddenException('No tienes permisos para realizar esta acción'),
      );
    });

    it('debe lanzar ForbiddenException cuando no existe membresía activa en la red', async () => {
      // Arrange
      mockMembresiasRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        target.canActivate(crearContexto(crearRequest('99'))),
      ).rejects.toThrow(
        new ForbiddenException('No perteneces a esta comunidad'),
      );
      expect(mockReflector.getAllAndOverride).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando la comunidad tiene borrado lógico', async () => {
      // Arrange
      const request = crearRequest('3');
      mockMembresiasRepository.findOne.mockResolvedValue({
        ...crearMembresia([RolUsuario.ADMINISTRACION]),
        red: null,
      } as unknown as Membresia);

      // Act & Assert
      await expect(target.canActivate(crearContexto(request))).rejects.toThrow(
        new ForbiddenException('No perteneces a esta comunidad'),
      );
      expect(request.red).toBeUndefined();
    });

    it.each([
      ['ausente', undefined],
      ['vacío', ''],
      ['no numérico', 'abc'],
      ['cero', '0'],
      ['negativo', '-1'],
      ['decimal', '1.5'],
    ])(
      'debe lanzar BadRequestException cuando el header X-Red-Id es %s',
      async (_caso, valorHeader) => {
        // Act & Assert
        await expect(
          target.canActivate(crearContexto(crearRequest(valorHeader))),
        ).rejects.toThrow(
          new BadRequestException(
            'Debes indicar la comunidad en el header X-Red-Id',
          ),
        );
        expect(mockMembresiasRepository.findOne).not.toHaveBeenCalled();
      },
    );

    it('debe lanzar UnauthorizedException cuando no hay usuario autenticado', async () => {
      // Arrange
      const request = crearRequest('3');
      delete request.user;

      // Act & Assert
      await expect(target.canActivate(crearContexto(request))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockMembresiasRepository.findOne).not.toHaveBeenCalled();
    });
  });
});

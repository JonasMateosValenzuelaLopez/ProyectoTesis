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
import { CodigoModulo } from '../../common/enums/modulo.enum';
import { RolUsuario } from '../../common/enums/rol.enum';
import { condicionVigente } from '../../common/utils/vigencia';
import {
  EstadoRedVecinal,
  RedVecinal,
} from '../../redes-vecinales/entities/red-vecinal.entity';
import { RedModulo } from '../../redes-vecinales/entities/red-modulo.entity';
import { Membresia } from '../../usuarios/entities/membresia.entity';
import { Residencia } from '../../usuarios/entities/residencia.entity';
import {
  MODULO_KEY,
  RequiereModulo,
} from '../decorators/requiere-modulo.decorator';
import { Roles, ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

type RequestFalso = {
  user?: { idUsuario: number; esPlataforma: boolean };
  header: jest.Mock;
  red?: unknown;
};

const TODOS_LOS_MODULOS = Object.values(CodigoModulo);
const SIN_ADMINISTRADOR_EXTERNO = TODOS_LOS_MODULOS.filter(
  (modulo) => modulo !== CodigoModulo.ADMINISTRADOR_EXTERNO,
);

describe('RolesGuard', () => {
  let target: RolesGuard;
  let mockMembresiasRepository: jest.Mocked<
    Pick<Repository<Membresia>, 'find'>
  >;
  let mockRedModulosRepository: jest.Mocked<
    Pick<Repository<RedModulo>, 'find'>
  >;
  let mockResidenciasRepository: jest.Mocked<
    Pick<Repository<Residencia>, 'find'>
  >;
  let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let metadatos: { roles?: RolUsuario[]; modulo?: CodigoModulo };

  const handler = () => undefined;
  class ControladorFalso {}

  const crearRequest = (
    idRedHeader: string | undefined,
    user: RequestFalso['user'] = { idUsuario: 7, esPlataforma: false },
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

  const red = (cambios: Partial<RedVecinal> = {}) =>
    ({
      idRed: 3,
      nombre: 'Villa Los Aromos',
      estado: EstadoRedVecinal.ACTIVA,
      motivoSuspension: null,
      ...cambios,
    }) as RedVecinal;

  const cargos = (
    roles: RolUsuario[],
    redMembresia: RedVecinal | null = red(),
  ) =>
    roles.map(
      (idRol, i) =>
        ({
          idMembresia: 30 + i,
          idUsuario: 7,
          idRed: 3,
          idRol,
          activo: true,
          red: redMembresia,
        }) as Membresia,
    );

  const modulosActivos = (modulos: CodigoModulo[]) =>
    modulos.map(
      (codigoModulo) => ({ idRed: 3, codigoModulo, activo: true }) as RedModulo,
    );

  beforeEach(async () => {
    metadatos = {};
    mockMembresiasRepository = { find: jest.fn() };
    mockRedModulosRepository = {
      find: jest.fn().mockResolvedValue(modulosActivos(TODOS_LOS_MODULOS)),
    };
    mockResidenciasRepository = { find: jest.fn().mockResolvedValue([]) };
    mockReflector = {
      getAllAndOverride: jest.fn((clave: string) =>
        clave === ROLES_KEY ? metadatos.roles : metadatos.modulo,
      ) as unknown as jest.Mocked<Reflector>['getAllAndOverride'],
    };

    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: mockReflector },
        {
          provide: getRepositoryToken(Membresia),
          useValue: mockMembresiasRepository,
        },
        {
          provide: getRepositoryToken(RedModulo),
          useValue: mockRedModulosRepository,
        },
        {
          provide: getRepositoryToken(Residencia),
          useValue: mockResidenciasRepository,
        },
      ],
    }).compile();

    target = module.get(RolesGuard);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('debe dejar en request.red los cargos, módulos y unidades vigentes', async () => {
      jest.useFakeTimers({ now: new Date(2026, 9, 26, 12) });
      const request = crearRequest('3');
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.RESIDENTE, RolUsuario.TESORERO]),
      );
      mockResidenciasRepository.find.mockResolvedValue([
        { idUnidad: 12, unidad: { idUnidad: 12, idRed: 3 } } as Residencia,
      ]);

      const resultado = await target.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.red).toEqual({
        idRed: 3,
        roles: [RolUsuario.RESIDENTE, RolUsuario.TESORERO],
        modulos: TODOS_LOS_MODULOS,
        idsUnidades: [12],
      });
      expect(request.header).toHaveBeenCalledWith('x-red-id');
      expect(mockMembresiasRepository.find).toHaveBeenCalledWith({
        where: {
          idUsuario: 7,
          idRed: 3,
          activo: true,
          ...condicionVigente('2026-10-26'),
        },
        relations: { red: true },
      });
      expect(mockRedModulosRepository.find).toHaveBeenCalledWith({
        where: { idRed: 3, activo: true },
      });
      expect(mockResidenciasRepository.find).toHaveBeenCalledWith({
        where: {
          idUsuario: 7,
          unidad: { idRed: 3 },
          ...condicionVigente('2026-10-26'),
        },
        relations: { unidad: true },
      });
    });

    it('debe permitir el acceso cuando el usuario tiene alguno de los roles exigidos', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.RESIDENTE, RolUsuario.TESORERO]),
      );
      metadatos.roles = [RolUsuario.ADMINISTRADOR, RolUsuario.TESORERO];

      const resultado = await target.canActivate(
        crearContexto(crearRequest('3')),
      );

      expect(resultado).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        handler,
        ControladorFalso,
      ]);
    });

    it('debe permitir el acceso cuando @Roles viene vacío', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.RESIDENTE]),
      );
      metadatos.roles = [];

      const resultado = await target.canActivate(
        crearContexto(crearRequest('3')),
      );

      expect(resultado).toBe(true);
    });

    it('debe lanzar ForbiddenException cuando el usuario no tiene ninguno de los roles exigidos', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.RESIDENTE]),
      );
      metadatos.roles = [RolUsuario.ADMINISTRADOR];

      await expect(
        target.canActivate(crearContexto(crearRequest('3'))),
      ).rejects.toThrow(
        new ForbiddenException('No tienes permisos para realizar esta acción'),
      );
    });

    it('debe dar permisos de Administrador al Presidente cuando la comunidad no tiene administrador externo', async () => {
      const request = crearRequest('3');
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.PRESIDENTE]),
      );
      mockRedModulosRepository.find.mockResolvedValue(
        modulosActivos(SIN_ADMINISTRADOR_EXTERNO),
      );
      metadatos.roles = [RolUsuario.ADMINISTRADOR];

      const resultado = await target.canActivate(crearContexto(request));

      expect(resultado).toBe(true);
      expect(request.red).toMatchObject({
        roles: [RolUsuario.PRESIDENTE, RolUsuario.ADMINISTRADOR],
      });
    });

    it('no debe dar permisos de Administrador al Presidente cuando hay administrador externo', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.PRESIDENTE]),
      );
      metadatos.roles = [RolUsuario.ADMINISTRADOR];

      await expect(
        target.canActivate(crearContexto(crearRequest('3'))),
      ).rejects.toThrow(
        new ForbiddenException('No tienes permisos para realizar esta acción'),
      );
    });

    it('no debe dar permisos de Administrador a otros cargos sin administrador externo', async () => {
      const request = crearRequest('3');
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.TESORERO]),
      );
      mockRedModulosRepository.find.mockResolvedValue(
        modulosActivos(SIN_ADMINISTRADOR_EXTERNO),
      );

      await target.canActivate(crearContexto(request));

      expect(request.red).toMatchObject({ roles: [RolUsuario.TESORERO] });
    });

    it('debe permitir el acceso cuando el módulo exigido está encendido', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.TESORERO]),
      );
      metadatos.modulo = CodigoModulo.COBROS;

      const resultado = await target.canActivate(
        crearContexto(crearRequest('3')),
      );

      expect(resultado).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(MODULO_KEY, [
        handler,
        ControladorFalso,
      ]);
    });

    it('debe lanzar ForbiddenException cuando el módulo exigido está apagado', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.CONSERJE]),
      );
      mockRedModulosRepository.find.mockResolvedValue(
        modulosActivos([CodigoModulo.MURO]),
      );
      metadatos.modulo = CodigoModulo.CONSERJERIA;

      await expect(
        target.canActivate(crearContexto(crearRequest('3'))),
      ).rejects.toThrow(
        new ForbiddenException('Esta función no está activa en tu comunidad'),
      );
    });

    it('debe lanzar ForbiddenException con el motivo cuando la comunidad está suspendida', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos(
          [RolUsuario.ADMINISTRADOR],
          red({
            estado: EstadoRedVecinal.SUSPENDIDA,
            motivoSuspension: 'Deuda con la plataforma',
          }),
        ),
      );

      await expect(
        target.canActivate(crearContexto(crearRequest('3'))),
      ).rejects.toThrow(
        new ForbiddenException(
          'Esta comunidad está suspendida: Deuda con la plataforma',
        ),
      );
      expect(mockRedModulosRepository.find).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando no hay cargos vigentes en la red', async () => {
      mockMembresiasRepository.find.mockResolvedValue([]);

      await expect(
        target.canActivate(crearContexto(crearRequest('99'))),
      ).rejects.toThrow(
        new ForbiddenException('No perteneces a esta comunidad'),
      );
      expect(mockReflector.getAllAndOverride).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException cuando la comunidad tiene borrado lógico', async () => {
      const request = crearRequest('3');
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.ADMINISTRADOR], null),
      );

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
        await expect(
          target.canActivate(crearContexto(crearRequest(valorHeader))),
        ).rejects.toThrow(
          new BadRequestException(
            'Debes indicar la comunidad en el header X-Red-Id',
          ),
        );
        expect(mockMembresiasRepository.find).not.toHaveBeenCalled();
      },
    );

    it('debe lanzar UnauthorizedException cuando no hay usuario autenticado', async () => {
      const request = crearRequest('3');
      delete request.user;

      await expect(target.canActivate(crearContexto(request))).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockMembresiasRepository.find).not.toHaveBeenCalled();
    });

    it('no debe dejar entrar al equipo de plataforma a una comunidad donde no tiene cargo', async () => {
      mockMembresiasRepository.find.mockResolvedValue([]);

      await expect(
        target.canActivate(
          crearContexto(
            crearRequest('3', { idUsuario: 1, esPlataforma: true }),
          ),
        ),
      ).rejects.toThrow(
        new ForbiddenException('No perteneces a esta comunidad'),
      );
    });
  });

  describe('con los decoradores reales', () => {
    @Roles(RolUsuario.ADMINISTRADOR)
    class ControladorDecorado {
      @RequiereModulo(CodigoModulo.COBROS)
      cobrar() {
        return undefined;
      }

      @Roles(RolUsuario.RESIDENTE)
      verMuro() {
        return undefined;
      }
    }

    const contextoDe = (metodo: keyof ControladorDecorado) =>
      ({
        switchToHttp: () => ({ getRequest: () => crearRequest('3') }),
        getHandler: () => ControladorDecorado.prototype[metodo],
        getClass: () => ControladorDecorado,
      }) as unknown as ExecutionContext;

    let targetReal: RolesGuard;

    beforeEach(() => {
      targetReal = new RolesGuard(
        new Reflector(),
        mockMembresiasRepository as unknown as Repository<Membresia>,
        mockRedModulosRepository as unknown as Repository<RedModulo>,
        mockResidenciasRepository as unknown as Repository<Residencia>,
      );
    });

    it('debe aplicar @RequiereModulo del método junto con @Roles de la clase', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.ADMINISTRADOR]),
      );
      mockRedModulosRepository.find.mockResolvedValue(
        modulosActivos([CodigoModulo.MURO]),
      );

      await expect(
        targetReal.canActivate(contextoDe('cobrar')),
      ).rejects.toThrow(
        new ForbiddenException('Esta función no está activa en tu comunidad'),
      );
    });

    it('debe rechazar al residente en un método que hereda @Roles de la clase', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.RESIDENTE]),
      );

      await expect(
        targetReal.canActivate(contextoDe('cobrar')),
      ).rejects.toThrow(
        new ForbiddenException('No tienes permisos para realizar esta acción'),
      );
    });

    it('debe dar prioridad al @Roles del método sobre el de la clase', async () => {
      mockMembresiasRepository.find.mockResolvedValue(
        cargos([RolUsuario.RESIDENTE]),
      );

      await expect(targetReal.canActivate(contextoDe('verMuro'))).resolves.toBe(
        true,
      );
    });
  });
});

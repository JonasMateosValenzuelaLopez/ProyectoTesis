import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { Rol } from './entities/rol.entity';
import { RolesService } from './roles.service';

describe('RolesService', () => {
  let target: RolesService;
  let mockRolesRepository: { find: jest.Mock };

  const rolesDelVolcado = () =>
    Object.entries(NOMBRE_ROL).map(([idRol, nombreRol]) => ({
      idRol: Number(idRol),
      nombreRol,
    }));

  beforeEach(async () => {
    mockRolesRepository = { find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Rol), useValue: mockRolesRepository },
      ],
    }).compile();

    target = module.get(RolesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('debe arrancar cuando la tabla roles coincide con RolUsuario', async () => {
      mockRolesRepository.find.mockResolvedValue(rolesDelVolcado());

      await expect(target.onModuleInit()).resolves.toBeUndefined();
    });

    it('debe lanzar un error cuando dos roles tienen los ids intercambiados', async () => {
      mockRolesRepository.find.mockResolvedValue(
        rolesDelVolcado().map((rol) =>
          rol.idRol === RolUsuario.ADMINISTRADOR
            ? { ...rol, nombreRol: 'Residente' }
            : rol.idRol === RolUsuario.RESIDENTE
              ? { ...rol, nombreRol: 'Administrador' }
              : rol,
        ),
      );

      await expect(target.onModuleInit()).rejects.toThrow(
        'id 1 (ADMINISTRADOR): se esperaba "Administrador" y la BD tiene "Residente"',
      );
    });

    it('debe lanzar un error cuando falta un rol en la tabla', async () => {
      mockRolesRepository.find.mockResolvedValue(
        rolesDelVolcado().filter((rol) => rol.idRol !== RolUsuario.CONSERJE),
      );

      await expect(target.onModuleInit()).rejects.toThrow(
        'id 5 (CONSERJE): se esperaba "Conserje" y la BD tiene "nada"',
      );
    });
  });
});

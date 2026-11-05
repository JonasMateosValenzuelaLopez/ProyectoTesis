import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, In, LessThan } from 'typeorm';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraComunidadService } from './bitacora-comunidad.service';
import {
  AmbitoBitacora,
  BitacoraAuditoria,
} from './entities/bitacora-auditoria.entity';

const FECHA = new Date('2026-11-05T15:00:00Z');

describe('BitacoraComunidadService', () => {
  let target: BitacoraComunidadService;
  let mockRepositorio: { find: jest.Mock };
  let manager: { find: jest.Mock };
  let membresiasDelRol: Partial<Membresia>[];

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.PRESIDENTE],
    modulos: [],
    idsUnidades: [],
  };

  const registro = (
    idBitacora: number,
    cambios: Partial<BitacoraAuditoria> = {},
  ) =>
    ({
      idBitacora,
      ambito: AmbitoBitacora.COMUNIDAD,
      idRed: 3,
      idUsuario: 7,
      accion: 'marcar_pago',
      entidad: 'cobro_unidades',
      idEntidad: null,
      detalle: { idsCobroUnidad: [1] },
      fechaCreacion: FECHA,
      ...cambios,
    }) as BitacoraAuditoria;

  beforeEach(async () => {
    membresiasDelRol = [{ idUsuario: 7 }, { idUsuario: 7 }, { idUsuario: 8 }];
    mockRepositorio = { find: jest.fn().mockResolvedValue([registro(10)]) };
    manager = {
      find: jest.fn(
        (entidad: unknown, opciones: { where: { activo?: boolean } }) => {
          if (entidad === Usuario) {
            return Promise.resolve([
              {
                idUsuario: 7,
                nombre: 'Ada',
                primerApellido: 'Soto',
                segundoApellido: null,
              },
            ]);
          }
          if (entidad === Membresia && opciones.where.activo) {
            return Promise.resolve([
              { idUsuario: 7, idRol: RolUsuario.ADMINISTRADOR },
            ]);
          }
          return Promise.resolve(membresiasDelRol);
        },
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        BitacoraComunidadService,
        {
          provide: getRepositoryToken(BitacoraAuditoria),
          useValue: mockRepositorio,
        },
        { provide: DataSource, useValue: { manager } },
      ],
    }).compile();

    target = module.get(BitacoraComunidadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver solo el ámbito Comunidad de la comunidad del contexto, de lo más nuevo a lo más antiguo', async () => {
    const resultado = await target.listar(red, {});

    expect(mockRepositorio.find).toHaveBeenCalledWith({
      where: { ambito: AmbitoBitacora.COMUNIDAD, idRed: 3 },
      order: { idBitacora: 'DESC' },
      take: 51,
    });
    expect(resultado).toEqual({
      registros: [
        {
          idBitacora: 10,
          fecha: FECHA,
          accion: 'marcar_pago',
          descripcion: 'Marcó un pago',
          entidad: 'cobro_unidades',
          idEntidad: null,
          detalle: { idsCobroUnidad: [1] },
          usuario: { idUsuario: 7, nombre: 'Ada Soto', cargo: 'Administrador' },
        },
      ],
      siguiente: null,
    });
  });

  it('debe filtrar por las personas que tuvieron ese cargo, también en el pasado', async () => {
    await target.listar(red, { rol: RolUsuario.ADMINISTRADOR });

    expect(manager.find).toHaveBeenCalledWith(Membresia, {
      select: { idUsuario: true },
      where: { idRed: 3, idRol: RolUsuario.ADMINISTRADOR },
      withDeleted: true,
    });
    expect(mockRepositorio.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: 3,
          idUsuario: In([7, 8]),
        },
      }),
    );
  });

  it('no debe consultar la bitácora si nadie tuvo ese cargo', async () => {
    membresiasDelRol = [];

    const resultado = await target.listar(red, { rol: RolUsuario.TESORERO });

    expect(resultado).toEqual({ registros: [], siguiente: null });
    expect(mockRepositorio.find).not.toHaveBeenCalled();
  });

  it('debe paginar con antesDe y devolver el cursor siguiente', async () => {
    mockRepositorio.find.mockResolvedValue([
      registro(9),
      registro(8),
      registro(7),
    ]);

    const { registros, siguiente } = await target.listar(red, {
      antesDe: 10,
      limite: 2,
    });

    expect(mockRepositorio.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ idBitacora: LessThan(10) }),
        take: 3,
      }),
    );
    expect(registros.map((r) => r.idBitacora)).toEqual([9, 8]);
    expect(siguiente).toBe(8);
  });

  it('debe dejar usuario en null cuando la cuenta ya no existe', async () => {
    mockRepositorio.find.mockResolvedValue([registro(5, { idUsuario: null })]);

    const { registros } = await target.listar(red, {});

    expect(registros[0].usuario).toBeNull();
  });

  it('debe mostrar el código cuando la acción no tiene texto', async () => {
    mockRepositorio.find.mockResolvedValue([
      registro(5, { accion: 'accion_nueva' }),
    ]);

    const { registros } = await target.listar(red, {});

    expect(registros[0].descripcion).toBe('accion_nueva');
  });
});

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, IsNull, LessThan } from 'typeorm';
import {
  AmbitoBitacora,
  BitacoraAuditoria,
} from '../bitacora/entities/bitacora-auditoria.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraPlataformaService } from './bitacora-plataforma.service';

const FECHA = new Date('2026-11-05T15:00:00Z');

describe('BitacoraPlataformaService', () => {
  let target: BitacoraPlataformaService;
  let mockBitacoraRepository: { find: jest.Mock };
  let mockUsuariosRepository: { find: jest.Mock };
  let mockRedesRepository: { find: jest.Mock };

  const registro = (
    idBitacora: number,
    cambios: Partial<BitacoraAuditoria> = {},
  ): BitacoraAuditoria =>
    ({
      idBitacora,
      ambito: AmbitoBitacora.PLATAFORMA,
      idRed: 1,
      idUsuario: 9,
      accion: 'suspender_comunidad',
      entidad: 'redes_vecinales',
      idEntidad: 1,
      detalle: { motivo: 'Deuda' },
      fechaCreacion: FECHA,
      ...cambios,
    }) as BitacoraAuditoria;

  beforeEach(async () => {
    mockBitacoraRepository = {
      find: jest.fn().mockResolvedValue([registro(5)]),
    };
    mockUsuariosRepository = {
      find: jest.fn().mockResolvedValue([
        {
          idUsuario: 9,
          nombre: 'Equipo',
          primerApellido: 'EntreCasas',
          segundoApellido: null,
        } as Usuario,
      ]),
    };
    mockRedesRepository = {
      find: jest
        .fn()
        .mockResolvedValue([{ idRed: 1, nombre: 'Villa Sol' } as RedVecinal]),
    };

    const module = await Test.createTestingModule({
      providers: [
        BitacoraPlataformaService,
        {
          provide: getRepositoryToken(BitacoraAuditoria),
          useValue: mockBitacoraRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockUsuariosRepository,
        },
        {
          provide: getRepositoryToken(RedVecinal),
          useValue: mockRedesRepository,
        },
      ],
    }).compile();

    target = module.get(BitacoraPlataformaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe devolver solo el ámbito Plataforma, de lo más nuevo a lo más antiguo, con el nombre de la comunidad y de quien actuó', async () => {
    const resultado = await target.listar({});

    expect(mockBitacoraRepository.find).toHaveBeenCalledWith({
      where: { ambito: AmbitoBitacora.PLATAFORMA },
      order: { idBitacora: 'DESC' },
      take: 51,
    });
    expect(resultado).toEqual({
      registros: [
        {
          idBitacora: 5,
          fecha: FECHA,
          accion: 'suspender_comunidad',
          entidad: 'redes_vecinales',
          idEntidad: 1,
          detalle: { motivo: 'Deuda' },
          comunidad: { idRed: 1, nombre: 'Villa Sol' },
          usuario: { idUsuario: 9, nombre: 'Equipo EntreCasas' },
        },
      ],
      siguiente: null,
    });
  });

  it('debe buscar los nombres incluyendo cuentas y comunidades eliminadas', async () => {
    await target.listar({});

    expect(mockUsuariosRepository.find).toHaveBeenCalledWith({
      where: { idUsuario: In([9]) },
      withDeleted: true,
    });
    expect(mockRedesRepository.find).toHaveBeenCalledWith({
      where: { idRed: In([1]) },
      withDeleted: true,
    });
  });

  it('debe filtrar por comunidad', async () => {
    await target.listar({ comunidad: '7' });

    expect(mockBitacoraRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ambito: AmbitoBitacora.PLATAFORMA, idRed: 7 },
      }),
    );
  });

  it('debe filtrar las acciones sin comunidad', async () => {
    await target.listar({ comunidad: 'ninguna' });

    expect(mockBitacoraRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ambito: AmbitoBitacora.PLATAFORMA, idRed: IsNull() },
      }),
    );
  });

  it('debe paginar desde antesDe y devolver el cursor de la página siguiente', async () => {
    mockBitacoraRepository.find.mockResolvedValue([
      registro(9),
      registro(8),
      registro(7),
    ]);

    const resultado = await target.listar({ antesDe: 10, limite: 2 });

    expect(mockBitacoraRepository.find).toHaveBeenCalledWith({
      where: {
        ambito: AmbitoBitacora.PLATAFORMA,
        idBitacora: LessThan(10),
      },
      order: { idBitacora: 'DESC' },
      take: 3,
    });
    expect(resultado.registros.map((r) => r.idBitacora)).toEqual([9, 8]);
    expect(resultado.siguiente).toBe(8);
  });

  it('debe dejar comunidad y usuario en null cuando el registro no los tiene', async () => {
    mockBitacoraRepository.find.mockResolvedValue([
      registro(3, { idRed: null, idUsuario: null }),
    ]);

    const { registros } = await target.listar({});

    expect(registros[0].comunidad).toBeNull();
    expect(registros[0].usuario).toBeNull();
    expect(mockUsuariosRepository.find).not.toHaveBeenCalled();
    expect(mockRedesRepository.find).not.toHaveBeenCalled();
  });
});

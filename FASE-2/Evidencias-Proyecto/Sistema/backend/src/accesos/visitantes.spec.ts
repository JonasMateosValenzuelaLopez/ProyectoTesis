import { EntityManager } from 'typeorm';
import { TipoVisitante, Visitante } from './entities/visitante.entity';
import { obtenerVisitante } from './visitantes';

describe('obtenerVisitante', () => {
  let mockConsulta: {
    insert: jest.Mock;
    into: jest.Mock;
    values: jest.Mock;
    orUpdate: jest.Mock;
    execute: jest.Mock;
  };
  let mockManager: {
    createQueryBuilder: jest.Mock;
    findOneOrFail: jest.Mock;
    insert: jest.Mock;
  };

  beforeEach(() => {
    mockConsulta = {
      insert: jest.fn(),
      into: jest.fn(),
      values: jest.fn(),
      orUpdate: jest.fn(),
      execute: jest.fn().mockResolvedValue(undefined),
    };
    mockConsulta.insert.mockReturnValue(mockConsulta);
    mockConsulta.into.mockReturnValue(mockConsulta);
    mockConsulta.values.mockReturnValue(mockConsulta);
    mockConsulta.orUpdate.mockReturnValue(mockConsulta);
    mockManager = {
      createQueryBuilder: jest.fn().mockReturnValue(mockConsulta),
      findOneOrFail: jest.fn().mockResolvedValue({ idVisitante: 12 }),
      insert: jest
        .fn()
        .mockResolvedValue({ identifiers: [{ idVisitante: 70 }] }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const ejecutar = (rut: string | null) =>
    obtenerVisitante(
      mockManager as unknown as EntityManager,
      3,
      'Daniela Pino Soto',
      rut,
    );

  it('debe crear o reutilizar al visitante por RUT con un upsert atómico que también lo restaura', async () => {
    const resultado = await ejecutar('12345678-5');

    expect(mockConsulta.into).toHaveBeenCalledWith(Visitante);
    expect(mockConsulta.values).toHaveBeenCalledWith({
      idRed: 3,
      rut: '12345678-5',
      nombre: 'Daniela',
      apellido: 'Pino Soto',
      tipo: TipoVisitante.ESPORADICO,
      fechaEliminacion: null,
    });
    expect(mockConsulta.orUpdate).toHaveBeenCalledWith(
      ['fecha_eliminacion'],
      ['id_red', 'rut'],
    );
    expect(mockConsulta.execute).toHaveBeenCalled();
    expect(resultado).toBe(12);
  });

  it('debe leer el id con bloqueo para ver la fila aunque la haya creado otra transacción', async () => {
    await ejecutar('12345678-5');

    expect(mockManager.findOneOrFail).toHaveBeenCalledWith(Visitante, {
      select: { idVisitante: true },
      where: { idRed: 3, rut: '12345678-5' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(mockManager.insert).not.toHaveBeenCalled();
  });

  it('debe crear uno nuevo sin upsert cuando no hay RUT', async () => {
    const resultado = await ejecutar(null);

    expect(mockManager.createQueryBuilder).not.toHaveBeenCalled();
    expect(mockManager.insert).toHaveBeenCalledWith(Visitante, {
      idRed: 3,
      rut: null,
      nombre: 'Daniela',
      apellido: 'Pino Soto',
      tipo: TipoVisitante.ESPORADICO,
    });
    expect(resultado).toBe(70);
  });
});

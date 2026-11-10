import { EntityManager } from 'typeorm';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { aplicarCambioModulo } from './cambiar-modulo';
import { RedModulo } from './entities/red-modulo.entity';

const ID_RED = 3;
const ID_USUARIO = 7;

const crearRedModulo = (cambios: Partial<RedModulo> = {}) =>
  ({
    idRed: ID_RED,
    codigoModulo: CodigoModulo.MURO,
    activo: true,
    fechaEliminacion: null,
    ...cambios,
  }) as RedModulo;

describe('aplicarCambioModulo', () => {
  let mockManager: jest.Mocked<
    Pick<EntityManager, 'findOne' | 'insert' | 'restore' | 'update'>
  >;

  beforeEach(() => {
    mockManager = {
      findOne: jest.fn(),
      insert: jest.fn(),
      restore: jest.fn(),
      update: jest.fn(),
    } as unknown as typeof mockManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const aplicar = (activo: boolean, codigo = CodigoModulo.MURO) =>
    aplicarCambioModulo(
      mockManager as unknown as EntityManager,
      ID_RED,
      codigo,
      activo,
      ID_USUARIO,
    );

  it('debe buscar la fila incluso si está eliminada', async () => {
    mockManager.findOne.mockResolvedValue(null);

    await aplicar(true);

    expect(mockManager.findOne).toHaveBeenCalledWith(RedModulo, {
      where: { idRed: ID_RED, codigoModulo: CodigoModulo.MURO },
      withDeleted: true,
    });
  });

  it('debe insertar la fila cuando el módulo nunca existió', async () => {
    mockManager.findOne.mockResolvedValue(null);

    const resultado = await aplicar(true, CodigoModulo.RESERVAS);

    expect(resultado).toBe(true);
    expect(mockManager.insert).toHaveBeenCalledWith(RedModulo, {
      idRed: ID_RED,
      codigoModulo: CodigoModulo.RESERVAS,
      activo: true,
      actualizadoPor: ID_USUARIO,
    });
    expect(mockManager.update).not.toHaveBeenCalled();
  });

  it('debe actualizar la fila cuando se apaga un módulo encendido', async () => {
    mockManager.findOne.mockResolvedValue(crearRedModulo());

    const resultado = await aplicar(false);

    expect(resultado).toBe(true);
    expect(mockManager.restore).not.toHaveBeenCalled();
    expect(mockManager.update).toHaveBeenCalledWith(
      RedModulo,
      { idRed: ID_RED, codigoModulo: CodigoModulo.MURO },
      { activo: false, actualizadoPor: ID_USUARIO },
    );
  });

  it('debe restaurar y actualizar la fila cuando estaba eliminada', async () => {
    mockManager.findOne.mockResolvedValue(
      crearRedModulo({ fechaEliminacion: new Date(2026, 9, 1) }),
    );

    const resultado = await aplicar(true);

    expect(resultado).toBe(true);
    expect(mockManager.restore).toHaveBeenCalledWith(RedModulo, {
      idRed: ID_RED,
      codigoModulo: CodigoModulo.MURO,
    });
    expect(mockManager.update).toHaveBeenCalledWith(
      RedModulo,
      { idRed: ID_RED, codigoModulo: CodigoModulo.MURO },
      { activo: true, actualizadoPor: ID_USUARIO },
    );
  });

  it.each([
    ['encendido y se pide encender', crearRedModulo(), true],
    ['apagado y se pide apagar', crearRedModulo({ activo: false }), false],
    [
      'eliminado y se pide apagar',
      crearRedModulo({ fechaEliminacion: new Date(2026, 9, 1) }),
      false,
    ],
    ['inexistente y se pide apagar', null, false],
  ])(
    'no debe escribir cuando el módulo está %s',
    async (_caso, actual, activo) => {
      mockManager.findOne.mockResolvedValue(actual);

      const resultado = await aplicar(activo);

      expect(resultado).toBe(false);
      expect(mockManager.insert).not.toHaveBeenCalled();
      expect(mockManager.restore).not.toHaveBeenCalled();
      expect(mockManager.update).not.toHaveBeenCalled();
    },
  );
});

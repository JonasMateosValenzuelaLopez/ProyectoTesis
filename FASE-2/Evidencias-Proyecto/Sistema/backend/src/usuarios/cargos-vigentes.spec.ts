import { EntityManager, In } from 'typeorm';
import { RolUsuario } from '../common/enums/rol.enum';
import { cargosVigentesPorUsuario, PRIORIDAD_CARGO } from './cargos-vigentes';
import { Membresia } from './entities/membresia.entity';

describe('cargosVigentesPorUsuario', () => {
  const manager = (membresias: Partial<Membresia>[]) =>
    ({
      find: jest.fn().mockResolvedValue(membresias),
    }) as unknown as EntityManager & {
      find: jest.Mock;
    };

  it('debe elegir el cargo de mayor prioridad de cada persona', async () => {
    const m = manager([
      { idUsuario: 7, idRol: RolUsuario.TESORERO },
      { idUsuario: 7, idRol: RolUsuario.PRESIDENTE },
      { idUsuario: 8, idRol: RolUsuario.CONSERJE },
    ]);

    const cargos = await cargosVigentesPorUsuario(m, 3, [7, 8, 7, null]);

    expect(cargos).toEqual(
      new Map([
        [7, 'Presidente'],
        [8, 'Conserje'],
      ]),
    );
    expect(m.find).toHaveBeenCalledWith(Membresia, {
      where: expect.objectContaining({
        idRed: 3,
        idUsuario: In([7, 8]),
        idRol: In(PRIORIDAD_CARGO),
        activo: true,
      }),
    });
  });

  it('no debe consultar cuando no hay personas', async () => {
    const m = manager([]);

    const cargos = await cargosVigentesPorUsuario(m, 3, [null]);

    expect(cargos.size).toBe(0);
    expect(m.find).not.toHaveBeenCalled();
  });
});

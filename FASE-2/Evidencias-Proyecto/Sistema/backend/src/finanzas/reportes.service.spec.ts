import { DataSource } from 'typeorm';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { Egreso } from './entities/egreso.entity';
import { ReportesService } from './reportes.service';

const AHORA = new Date('2026-11-05T15:00:00Z');

describe('ReportesService', () => {
  let target: ReportesService;
  let consultas: Record<string, jest.Mock>[];
  let manager: { find: jest.Mock; createQueryBuilder: jest.Mock };

  const red: ContextoRed = {
    idRed: 3,
    roles: [RolUsuario.TESORERO],
    modulos: [],
    idsUnidades: [],
  };

  const consulta = (resultado: unknown) => {
    const q: Record<string, jest.Mock> = {};
    for (const metodo of [
      'innerJoin',
      'select',
      'addSelect',
      'where',
      'andWhere',
      'groupBy',
      'orderBy',
      'addOrderBy',
    ]) {
      q[metodo] = jest.fn().mockReturnValue(q);
    }
    q.getMany = jest.fn().mockResolvedValue(resultado);
    q.getRawMany = jest.fn().mockResolvedValue(resultado);
    return q;
  };

  const fila = (monto: number, estado: EstadoCobroUnidad) =>
    ({ monto, estado }) as CobroUnidad;

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    const egresosDelMes = [
      {
        idEgreso: 1,
        idCategoria: 1,
        fechaEgreso: '2026-11-03',
        descripcion: 'Portón',
        proveedor: 'Automatismos',
        monto: 40000,
      } as Egreso,
    ];
    consultas = [
      consulta(egresosDelMes),
      consulta([
        { idCategoria: 1, total: '300000' },
        { idCategoria: 2, total: '50000' },
      ]),
      consulta([{ idCategoria: 1, total: '120000' }]),
    ];
    let indice = 0;
    manager = {
      find: jest.fn((entidad: unknown) =>
        Promise.resolve(
          entidad === CategoriaGasto
            ? [
                { idCategoria: 1, nombre: 'Fondo de reserva' },
                { idCategoria: 2, nombre: 'Gasto común' },
                { idCategoria: 3, nombre: 'Sin uso' },
              ]
            : entidad === Cobro
              ? [
                  {
                    idCobro: 70,
                    idCategoria: 1,
                    concepto: 'Fondo noviembre',
                    fechaEmision: '2026-11-01',
                    unidades: [
                      fila(20000, EstadoCobroUnidad.PAGADO),
                      fila(20000, EstadoCobroUnidad.PENDIENTE),
                      fila(20000, EstadoCobroUnidad.EXENTO),
                    ],
                  },
                ]
              : [],
        ),
      ),
      createQueryBuilder: jest.fn(() => consultas[indice++]),
    };
    target = new ReportesService({ manager } as unknown as DataSource);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debe armar el flujo de caja del mes con ingresos recaudados y egresos válidos', async () => {
    const { periodo, flujoDeCaja } = await target.reporte(red);

    expect(periodo).toBe('2026-11-01');
    expect(flujoDeCaja).toEqual({
      ingresos: [
        {
          idCobro: 70,
          concepto: 'Fondo noviembre',
          fechaEmision: '2026-11-01',
          esperado: 40000,
          recaudado: 20000,
        },
      ],
      egresos: [
        {
          idEgreso: 1,
          fechaEgreso: '2026-11-03',
          descripcion: 'Portón',
          proveedor: 'Automatismos',
          monto: 40000,
        },
      ],
      totalIngresos: 20000,
      totalEgresos: 40000,
      saldo: -20000,
    });
  });

  it('debe resumir por categoría el mes y el saldo histórico, omitiendo las categorías sin movimientos', async () => {
    const { porCategoria } = await target.reporte(red);

    expect(porCategoria).toEqual([
      {
        idCategoria: 1,
        nombre: 'Fondo de reserva',
        cobrado: 40000,
        recaudado: 20000,
        egresos: 40000,
        diferencia: -20000,
        saldoHistorico: 180000,
      },
      {
        idCategoria: 2,
        nombre: 'Gasto común',
        cobrado: 0,
        recaudado: 0,
        egresos: 0,
        diferencia: 0,
        saldoHistorico: 50000,
      },
    ]);
  });

  it('debe filtrar los egresos por el mes pedido, hasta su último día', async () => {
    await target.reporte(red, '2026-02');

    expect(consultas[0].andWhere).toHaveBeenCalledWith(
      'egreso.fechaEgreso BETWEEN :desde AND :hasta',
      { desde: '2026-02-01', hasta: '2026-02-28' },
    );
    expect(manager.find).toHaveBeenCalledWith(
      Cobro,
      expect.objectContaining({ where: { idRed: 3, periodo: '2026-02-01' } }),
    );
  });
});

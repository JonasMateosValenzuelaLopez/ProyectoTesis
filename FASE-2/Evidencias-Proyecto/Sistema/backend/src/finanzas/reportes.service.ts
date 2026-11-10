import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { fechaHoy } from '../common/utils/vigencia';
import { CategoriaGasto } from './entities/categoria-gasto.entity';
import { CobroUnidad, EstadoCobroUnidad } from './entities/cobro-unidad.entity';
import { Cobro } from './entities/cobro.entity';
import { Egreso, EstadoVisado } from './entities/egreso.entity';

const EGRESOS_VALIDOS = [EstadoVisado.NO_REQUIERE, EstadoVisado.APROBADO];

interface TotalPorCategoria {
  idCategoria: number;
  total: string | null;
}

const ultimoDia = (periodo: string) => {
  const [anio, mes] = periodo.split('-').map(Number);
  return new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
};

@Injectable()
export class ReportesService {
  constructor(private readonly dataSource: DataSource) {}

  async reporte(red: ContextoRed, periodoPedido?: string) {
    const mes = periodoPedido ?? fechaHoy().slice(0, 7);
    const periodo = `${mes}-01`;
    const hasta = ultimoDia(mes);
    const manager = this.dataSource.manager;

    const [categorias, cobros, egresos, recaudadoHistorico, egresosHistoricos] =
      await Promise.all([
        manager.find(CategoriaGasto, {
          where: { idRed: red.idRed },
          order: { nombre: 'ASC' },
          withDeleted: true,
        }),
        manager.find(Cobro, {
          where: { idRed: red.idRed, periodo },
          relations: { unidades: true },
          order: { idCobro: 'ASC' },
        }),
        manager
          .createQueryBuilder(Egreso, 'egreso')
          .where('egreso.idRed = :idRed', { idRed: red.idRed })
          .andWhere('egreso.estadoVisado IN (:...estados)', {
            estados: EGRESOS_VALIDOS,
          })
          .andWhere('egreso.fechaEgreso BETWEEN :desde AND :hasta', {
            desde: periodo,
            hasta,
          })
          .orderBy('egreso.fechaEgreso', 'ASC')
          .addOrderBy('egreso.idEgreso', 'ASC')
          .getMany(),
        manager
          .createQueryBuilder(CobroUnidad, 'fila')
          .innerJoin('fila.cobro', 'cobro')
          .select('cobro.idCategoria', 'idCategoria')
          .addSelect('SUM(fila.monto)', 'total')
          .where('cobro.idRed = :idRed', { idRed: red.idRed })
          .andWhere('cobro.fechaEliminacion IS NULL')
          .andWhere('fila.estado = :pagado', {
            pagado: EstadoCobroUnidad.PAGADO,
          })
          .groupBy('cobro.idCategoria')
          .getRawMany<TotalPorCategoria>(),
        manager
          .createQueryBuilder(Egreso, 'egreso')
          .select('egreso.idCategoria', 'idCategoria')
          .addSelect('SUM(egreso.monto)', 'total')
          .where('egreso.idRed = :idRed', { idRed: red.idRed })
          .andWhere('egreso.estadoVisado IN (:...estados)', {
            estados: EGRESOS_VALIDOS,
          })
          .groupBy('egreso.idCategoria')
          .getRawMany<TotalPorCategoria>(),
      ]);

    const comoMapa = (filas: TotalPorCategoria[]) =>
      new Map(filas.map((f) => [Number(f.idCategoria), Number(f.total ?? 0)]));
    const recaudadoTotal = comoMapa(recaudadoHistorico);
    const egresadoTotal = comoMapa(egresosHistoricos);
    const sumaFilas = (cobro: Cobro, incluir: (f: CobroUnidad) => boolean) =>
      cobro.unidades.filter(incluir).reduce((t, f) => t + f.monto, 0);
    const ingresos = cobros.map((cobro) => ({
      idCobro: cobro.idCobro,
      idCategoria: cobro.idCategoria,
      concepto: cobro.concepto,
      fechaEmision: cobro.fechaEmision,
      esperado: sumaFilas(cobro, (f) => f.estado !== EstadoCobroUnidad.EXENTO),
      recaudado: sumaFilas(cobro, (f) => f.estado === EstadoCobroUnidad.PAGADO),
    }));
    const totalIngresos = ingresos.reduce((t, i) => t + i.recaudado, 0);
    const totalEgresos = egresos.reduce((t, e) => t + e.monto, 0);
    const usadas = new Set([
      ...ingresos.map((i) => i.idCategoria),
      ...egresos.map((e) => e.idCategoria),
      ...recaudadoTotal.keys(),
      ...egresadoTotal.keys(),
    ]);

    return {
      periodo,
      flujoDeCaja: {
        ingresos: ingresos.map((ingreso) => ({
          idCobro: ingreso.idCobro,
          concepto: ingreso.concepto,
          fechaEmision: ingreso.fechaEmision,
          esperado: ingreso.esperado,
          recaudado: ingreso.recaudado,
        })),
        egresos: egresos.map((egreso) => ({
          idEgreso: egreso.idEgreso,
          fechaEgreso: egreso.fechaEgreso,
          descripcion: egreso.descripcion,
          proveedor: egreso.proveedor,
          monto: egreso.monto,
        })),
        totalIngresos,
        totalEgresos,
        saldo: totalIngresos - totalEgresos,
      },
      porCategoria: categorias
        .filter((categoria) => usadas.has(categoria.idCategoria))
        .map((categoria) => {
          const propios = ingresos.filter(
            (i) => i.idCategoria === categoria.idCategoria,
          );
          const recaudado = propios.reduce((t, i) => t + i.recaudado, 0);
          const egresado = egresos
            .filter((e) => e.idCategoria === categoria.idCategoria)
            .reduce((t, e) => t + e.monto, 0);
          return {
            idCategoria: categoria.idCategoria,
            nombre: categoria.nombre,
            cobrado: propios.reduce((t, i) => t + i.esperado, 0),
            recaudado,
            egresos: egresado,
            diferencia: recaudado - egresado,
            saldoHistorico:
              (recaudadoTotal.get(categoria.idCategoria) ?? 0) -
              (egresadoTotal.get(categoria.idCategoria) ?? 0),
          };
        }),
    };
  }
}

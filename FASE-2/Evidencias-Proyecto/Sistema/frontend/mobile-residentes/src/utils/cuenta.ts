import type { EstadoCuenta, Periodo } from '@/data/demo';
import type { Tono } from '@/components/ec/Chip';

export const totalPeriodo = (p: Periodo) => p.items.reduce((s, i) => s + i.monto, 0);

// Estado del gasto común del mes, con el mismo criterio del plano de pagos del panel
export function resumenCuenta(e: EstadoCuenta) {
  const mes = totalPeriodo(e.actual);
  const pagado = e.actual.estado === 'pagado';
  const total = (pagado ? 0 : mes) + e.deudaAnterior;
  const estado: { texto: string; tono: Tono } = e.deudaAnterior > 0
    ? { texto: 'Con deuda', tono: 'bad' }
    : pagado ? { texto: 'Pagado', tono: 'ok' } : { texto: 'Pendiente', tono: 'warn' };
  return { mes, total, pagado, estado };
}

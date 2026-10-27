import { NOMBRE_USUARIO, PERIODO_ACTUAL, nombreMes, type Cobro, type GastoComun, type Pago } from '@/data/demo';
import type { Tono } from '@/components/ec/Chip';

// Un gasto de la vivienda con los datos de su cobro (lo que devolverá la API con un JOIN)
export type GastoDetalle = GastoComun & { concepto: string; es_extraordinario: 0 | 1 };
// Los gastos de un mes agrupados, como los ve el residente
export type MesCuenta = {
  mes: number; anio: number; nombre: string; fecha_vencimiento: string; gastos: GastoDetalle[];
  estado_pago: GastoComun['estado_pago']; validadoPor: string | null; fecha_validacion: string | null;
};
export type EstadoCuenta = {
  actual: MesCuenta; historial: MesCuenta[]; deudaAnterior: number;
  // Transferencia avisada desde la app que la administración aún no valida
  avisoPendiente: { monto: number; fecha_pago: string; observacion: string | null } | null;
};

const sinPagar = (g: GastoComun) => g.estado_pago === 'Pendiente' || g.estado_pago === 'Atrasado';
export const totalMes = (m: MesCuenta) => m.gastos.filter((g) => g.estado_pago !== 'Exento').reduce((s, g) => s + g.monto_total, 0);

// Arma la cuenta de una vivienda a partir de sus filas de `gastos_comunes` y `pagos`
export function estadoCuenta(id_unidad: number, cobros: Cobro[], gastos: GastoComun[], pagos: Pago[]): EstadoCuenta {
  const propios = gastos.filter((g) => g.id_unidad === id_unidad);
  const ids = new Set(propios.map((g) => g.id_gasto));
  const pagosPropios = pagos.filter((p) => ids.has(p.id_gasto));
  const meses = new Map<string, MesCuenta>();
  propios.forEach((g) => {
    const c = cobros.find((x) => x.id_cobro === g.id_cobro);
    const clave = `${g.anio}-${String(g.mes).padStart(2, '0')}`;
    const nombre = `${nombreMes(g.mes)[0].toUpperCase()}${nombreMes(g.mes).slice(1)} ${g.anio}`;
    const m = meses.get(clave) ?? { mes: g.mes, anio: g.anio, nombre, fecha_vencimiento: g.fecha_vencimiento, gastos: [], estado_pago: 'Pagado', validadoPor: null, fecha_validacion: null };
    m.gastos.push({ ...g, concepto: c?.concepto ?? g.descripcion ?? 'Cobro', es_extraordinario: c?.es_extraordinario ?? 0 });
    meses.set(clave, m);
  });
  const lista = [...meses.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, m]) => {
    const estados = m.gastos.map((g) => g.estado_pago);
    const estado_pago: GastoComun['estado_pago'] = estados.every((e) => e === 'Exento') ? 'Exento'
      : estados.includes('Atrasado') ? 'Atrasado' : estados.includes('Pendiente') ? 'Pendiente' : 'Pagado';
    // La validación más reciente del mes: quién marcó el pago y cuándo
    const validado = pagosPropios
      .filter((p) => p.estado_validacion === 'Validado' && m.gastos.some((g) => g.id_gasto === p.id_gasto))
      .sort((a, b) => (b.fecha_validacion ?? '').localeCompare(a.fecha_validacion ?? ''))[0];
    return {
      ...m, estado_pago,
      fecha_vencimiento: m.gastos.reduce((f, g) => (g.fecha_vencimiento > f ? g.fecha_vencimiento : f), m.fecha_vencimiento),
      validadoPor: validado?.id_validador ? NOMBRE_USUARIO[validado.id_validador] ?? 'la administración' : null,
      fecha_validacion: validado?.fecha_validacion ?? null,
    };
  });
  const vacio: MesCuenta = {
    ...PERIODO_ACTUAL, nombre: `${nombreMes(PERIODO_ACTUAL.mes)} ${PERIODO_ACTUAL.anio}`, fecha_vencimiento: '', gastos: [], estado_pago: 'Pagado', validadoPor: null, fecha_validacion: null,
  };
  const actual = lista.find((m) => m.mes === PERIODO_ACTUAL.mes && m.anio === PERIODO_ACTUAL.anio) ?? vacio;
  const avisos = pagosPropios.filter((p) => p.estado_validacion === 'Pendiente');
  return {
    actual,
    historial: lista.filter((m) => m !== actual),
    deudaAnterior: propios.filter((g) => g.estado_pago === 'Atrasado').reduce((s, g) => s + g.monto_total, 0),
    avisoPendiente: avisos.length
      ? { monto: avisos.reduce((s, p) => s + p.monto_pagado, 0), fecha_pago: avisos[0].fecha_pago, observacion: avisos[0].observacion }
      : null,
  };
}

// Gastos que la vivienda todavía debe, del más antiguo al más nuevo (a los que se imputa una transferencia)
export const gastosSinPagar = (e: EstadoCuenta) => [...e.historial].reverse().concat(e.actual).flatMap((m) => m.gastos.filter(sinPagar));

// Estado del gasto común del mes, con el mismo criterio del plano de pagos del panel
export function resumenCuenta(e: EstadoCuenta) {
  const mes = totalMes(e.actual);
  const pagado = !e.actual.gastos.some(sinPagar);
  const total = (pagado ? 0 : e.actual.gastos.filter(sinPagar).reduce((s, g) => s + g.monto_total, 0)) + e.deudaAnterior;
  const estado: { texto: string; tono: Tono } = e.deudaAnterior > 0
    ? { texto: 'Con deuda', tono: 'bad' }
    : pagado ? { texto: 'Pagado', tono: 'ok' } : { texto: 'Pendiente', tono: 'warn' };
  return { mes, total, pagado, estado };
}

import { api } from './cliente';

// Endpoints de finanzas de una comunidad (finanzas.controller.ts y egresos-exenciones.controller.ts).
// Todos exigen el módulo «cobros». Responden con los nombres del backend.

// ---------- Categorías (Tesorería y Administración las leen; solo Tesorería las crea o edita) ----------
// [{ idCategoria, nombre, activa }]
export const listarCategorias = () => api('/finanzas/categorias');
export const crearCategoria = (nombre) => api('/finanzas/categorias', { metodo: 'POST', cuerpo: { nombre } });
// { nombre?, activa? }
export const editarCategoria = (idCategoria, cambios) => api(`/finanzas/categorias/${idCategoria}`, { metodo: 'PATCH', cuerpo: cambios });

// ---------- Cobros ----------
// [{ idCobro, concepto, descripcion, categoria: { idCategoria, nombre } | null, montoPorUnidad, periodo, fechaEmision,
//    fechaVencimiento, extraordinario, totales: { unidades, pagadas, exentas, pendientes, esperado, recaudado } }]
export const listarCobros = () => api('/finanzas/cobros');
// { idCategoria, concepto, descripcion?, montoPorUnidad, fechaVencimiento, extraordinario? } → cobro + { correos }
export const crearCobro = (datos) => api('/finanzas/cobros', { metodo: 'POST', cuerpo: datos });
// { concepto?, descripcion?, montoPorUnidad?, fechaVencimiento? }. El monto no cambia si ya hay pagos, avisos o exenciones.
export const editarCobro = (idCobro, cambios) => api(`/finanzas/cobros/${idCobro}`, { metodo: 'PATCH', cuerpo: cambios });
// Solo si el cobro no tiene pagos, avisos ni exenciones
export const eliminarCobro = (idCobro) => api(`/finanzas/cobros/${idCobro}`, { metodo: 'DELETE' });

// ---------- Estado de la comunidad y de cada unidad ----------
// { periodo, resumen: { totalUnidades, alDia, esperado, recaudado, deudaMorosa, avisosPorValidar, exencionesEnCurso, egresosPorVisar },
//   unidades: [{ idUnidad, estado: 'pagado' | 'pendiente' | 'moroso' | 'exencion' | null }],
//   morosos: [{ idUnidad, numeroIdentificador, callePasaje, deudaAtrasada, pendienteNoVencido, total, cobrosAtrasados }],
//   avisosPorValidar: [aviso + { idUnidad, concepto }], ultimoRecordatorio: { fecha, destinatarios } | null }
export const estado = () => api('/finanzas/estado');
// { idUnidad, numeroIdentificador, callePasaje, deudaAtrasada, pendienteNoVencido, total,
//   cobros: [{ idCobroUnidad, idCobro, concepto, periodo, fechaVencimiento, extraordinario, monto, estado: 'Pendiente' | 'Pagado' | 'Exento',
//              atrasado, pagadoMarcadoEn, exencion: { idExencion, estado } | null,
//              avisos: [{ idAviso, idCobroUnidad, monto, fechaPago, observacion, estado, motivoRechazo, avisadoPor: { idUsuario, nombre } | null }] }] }
export const detalleUnidad = (idUnidad) => api(`/finanzas/unidades/${idUnidad}`);

// ---------- Pagos y avisos de transferencia ----------
// Marca pagados los cobros (y valida los avisos pendientes de esos cobros) → { marcados, avisosValidados }
export const marcarPagos = (idsCobroUnidad, metodo) =>
  api('/finanzas/pagos', { metodo: 'POST', cuerpo: { idsCobroUnidad, ...(metodo ? { metodo } : {}) } });
export const anularPago = (idCobroUnidad) => api(`/finanzas/cobro-unidades/${idCobroUnidad}/pago`, { metodo: 'DELETE' });
// → { rechazados }
export const rechazarAvisos = (idsAviso, motivo) =>
  api('/finanzas/avisos/rechazo', { metodo: 'POST', cuerpo: { idsAviso, ...(motivo ? { motivo } : {}) } });
// Correo a las unidades con cobros vencidos → { unidades, destinatarios }
export const enviarRecordatorio = () => api('/finanzas/recordatorios', { metodo: 'POST' });

// ---------- Egresos ----------
// [{ idEgreso, categoria: { idCategoria, nombre } | null, monto, descripcion, proveedor, fechaEgreso, comprobanteUrl,
//    requiereVisado, estadoVisado: 'No requiere' | 'Pendiente' | 'Aprobado' | 'Rechazado', visadoPor, visadoEn, creadoPor, fechaCreacion }]
export const listarEgresos = () => api('/finanzas/egresos');
// { idCategoria, monto, descripcion, proveedor?, fechaEgreso, comprobanteUrl? } → egreso
export const registrarEgreso = (datos) => api('/finanzas/egresos', { metodo: 'POST', cuerpo: datos });
// Presidencia: { aprobado, comentario? } → egreso
export const visarEgreso = (idEgreso, aprobado, comentario) =>
  api(`/finanzas/egresos/${idEgreso}/visado`, { metodo: 'POST', cuerpo: { aprobado, ...(comentario ? { comentario } : {}) } });

// ---------- Exenciones (dos etapas: Tesorería revisa, Presidencia resuelve) ----------
// [{ idExencion, idCobroUnidad, unidad: { idUnidad, numeroIdentificador } | null, concepto, monto, motivo,
//    estado: 'Pendiente' | 'Por aprobar' | 'Aprobada' | 'Rechazada', solicitadaPor, fechaSolicitud,
//    revisadaPor, revisadaEn, resueltaPor, resueltaEn, comentarioResolucion }]
export const listarExenciones = () => api('/finanzas/exenciones');
// Tesorería la pide directamente: nace «Por aprobar» → exención
export const solicitarExencion = (idCobroUnidad, motivo) => api('/finanzas/exenciones', { metodo: 'POST', cuerpo: { idCobroUnidad, motivo } });
const decision = (aprobado, comentario) => ({ aprobado, ...(comentario ? { comentario } : {}) });
// Tesorería acepta (pasa a «Por aprobar») o rechaza la que pidió un residente
export const revisarExencion = (idExencion, aprobado, comentario) =>
  api(`/finanzas/exenciones/${idExencion}/revision`, { metodo: 'POST', cuerpo: decision(aprobado, comentario) });
// Presidencia aprueba (el cobro queda exento) o rechaza
export const resolverExencion = (idExencion, aprobado, comentario) =>
  api(`/finanzas/exenciones/${idExencion}/resolucion`, { metodo: 'POST', cuerpo: decision(aprobado, comentario) });

// ---------- Reportes ----------
// periodo 'AAAA-MM' (por defecto el mes actual) →
// { periodo, flujoDeCaja: { ingresos: [{ idCobro, concepto, fechaEmision, esperado, recaudado }],
//   egresos: [{ idEgreso, fechaEgreso, descripcion, proveedor, monto }], totalIngresos, totalEgresos, saldo },
//   porCategoria: [{ idCategoria, nombre, cobrado, recaudado, egresos, diferencia, saldoHistorico }] }
export const reporte = (periodo) => api('/finanzas/reportes', { params: periodo ? { periodo } : undefined });

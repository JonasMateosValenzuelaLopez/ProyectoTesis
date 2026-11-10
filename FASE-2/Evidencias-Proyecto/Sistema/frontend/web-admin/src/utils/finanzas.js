// Reglas y formatos de finanzas que el panel repite del backend (reglas-finanzas.ts y los DTO).

export const MAX_MONTO = 99_999_999;
export const MAX_CONCEPTO = 150;
export const MAX_DESCRIPCION_COBRO = 2000;
export const MAX_CATEGORIA = 60;
export const MAX_MOTIVO = 255;
export const MAX_DESCRIPCION_EGRESO = 255;
export const MAX_PROVEEDOR = 150;

// Fecha de hoy en hora local, como 'AAAA-MM-DD' (lo que esperan los DTO)
export const hoyISO = () => {
  const f = new Date();
  return new Date(f.getTime() - f.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

// Mes del periodo: 'AAAA-MM-01' → «noviembre 2026»
const formatoMes = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
export const nombrePeriodo = (periodo) => (periodo ? formatoMes.format(new Date(`${periodo.slice(0, 7)}-15T12:00:00`)) : '');

// Monto escrito por la persona: solo dígitos, sin ceros a la izquierda
export const soloDigitos = (texto) => texto.replace(/\D/g, '').replace(/^0+(?=\d)/, '');

export const errorMonto = (texto) => {
  const monto = Number(texto);
  if (!texto) return 'Escribe el monto';
  if (!Number.isInteger(monto) || monto < 1 || monto > MAX_MONTO) return `El monto debe ser entre $1 y $${MAX_MONTO.toLocaleString('es-CL')}`;
  return null;
};

// Nombres de quienes viven en la unidad (GET unidades → `ocupantes`), titular primero
export const residentesDe = (unidad) => [...(unidad?.ocupantes ?? [])]
  .sort((a, b) => Number(b.titular) - Number(a.titular))
  .map((o) => o.nombre)
  .join(', ');

// Estados de una exención (EstadoExencion del backend)
export const ESTADO_EXENCION = {
  Pendiente: { texto: 'Revisión de Tesorería', color: 'warning' },
  'Por aprobar': { texto: 'Decisión de Presidencia', color: 'info' },
  Aprobada: { texto: 'Aprobada', color: 'success' },
  Rechazada: { texto: 'Rechazada', color: 'error' },
};

// Estados del visado de un egreso (EstadoVisado del backend)
export const ESTADO_VISADO = {
  'No requiere': { texto: 'Sin visado', color: 'success' },
  Pendiente: { texto: 'Esperando visado', color: 'warning' },
  Aprobado: { texto: 'Visado', color: 'success' },
  Rechazado: { texto: 'Rechazado', color: 'error' },
};

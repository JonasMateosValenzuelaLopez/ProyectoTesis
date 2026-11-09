// Conservación de datos de visitantes (Ley 21.719), como la API (retencion-accesos.service.ts):
// pasados 12 meses, cada noche se borran el nombre, el RUT y la patente de las visitas. La
// administración puede retener un período por un incidente para que no se anonimice.

export const RETENCION_MESES = 12;
export const MAX_DIAS_RETENCION = 31;
export const MIN_MOTIVO_RETENCION = 10;
export const MAX_MOTIVO_RETENCION = 300;

// Fecha local 'AAAA-MM-DD'
export const diaISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Primer día que todavía se conserva: hoy menos los meses de conservación
export function limiteConservacion(hoy = new Date(), meses = RETENCION_MESES) {
  const d = new Date(hoy);
  d.setMonth(d.getMonth() - meses);
  return diaISO(d);
}

// Días que cubre una retención, contando el primero y el último
export const diasCubiertos = (desde, hasta) => Math.round((new Date(`${hasta}T12:00:00`) - new Date(`${desde}T12:00:00`)) / 86400000) + 1;

// Lo que valida la API al crear una retención. Devuelve { campo: mensaje } o null.
export function errorRetencion({ desde, hasta, motivo }, meses = RETENCION_MESES, hoy = new Date()) {
  const dia = diaISO(hoy);
  if (!desde) return { desde: 'Indica desde qué día retener los registros' };
  if (!hasta) return { hasta: 'Indica hasta qué día retener los registros' };
  if (desde > dia) return { desde: 'La fecha no puede ser futura' };
  if (hasta > dia) return { hasta: 'La fecha no puede ser futura' };
  if (hasta < desde) return { hasta: 'La fecha de término debe ser igual o posterior a la de inicio' };
  if (diasCubiertos(desde, hasta) > MAX_DIAS_RETENCION) return { hasta: `Una retención puede cubrir como máximo ${MAX_DIAS_RETENCION} días` };
  if (hasta < limiteConservacion(hoy, meses)) return { hasta: `Esos registros ya superaron los ${meses} meses de conservación y fueron anonimizados` };
  const m = motivo.trim().replace(/\s+/g, ' ');
  if (m.length < MIN_MOTIVO_RETENCION) return { motivo: `Explica el incidente en al menos ${MIN_MOTIVO_RETENCION} caracteres` };
  if (m.length > MAX_MOTIVO_RETENCION) return { motivo: `El motivo no puede superar ${MAX_MOTIVO_RETENCION} caracteres` };
  return null;
}

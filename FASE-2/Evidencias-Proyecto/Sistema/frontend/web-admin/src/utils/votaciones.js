// Límites de la API (votaciones.dto.ts y reglas-votaciones.ts)
export const MIN_OPCIONES = 2;
export const MAX_OPCIONES = 6;
export const MAX_DIAS_ABIERTA = 90;
export const MAX_TITULO = 150;
export const MAX_DETALLE = 2000;
export const MAX_OPCION = 150;
export const MAX_ACUERDOS = 30;
export const MAX_LUGAR = 100;
export const MAX_TEXTO_ACTA = 5000;
export const MAX_ACUERDO = 255;
export const MAX_RESPONSABLE = 100;
export const TIPOS_ACTA = ['Reunión de directiva', 'Asamblea ordinaria', 'Asamblea extraordinaria'];

// Fecha local AAAA-MM-DD a `n` días de hoy (la API compara con la fecha de la comunidad, no en UTC)
export const fechaEnDias = (n = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

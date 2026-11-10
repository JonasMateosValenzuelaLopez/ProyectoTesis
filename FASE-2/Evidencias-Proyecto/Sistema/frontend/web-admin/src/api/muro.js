import { api } from './cliente';

// Muro (muro.controller.ts, módulo «muro») y moderación del marketplace (marketplace.controller.ts, módulo «marketplace»).
//
// Publicación del muro: { idPublicacion, tipo: 'Comunicado' | 'Norma' | 'Vecino', titulo, contenido, fecha,
//   autor: { idUsuario, nombre, cargo } | null, unidad: { idUnidad, numeroIdentificador } | null,
//   estadoAprobacion: 'No requiere' | 'Pendiente' | 'Aprobada' | 'Rechazada', aprobadoPor, aprobadoEn,
//   estadoModeracion: 'Publicada' | 'Oculta', moderadoEn }
// En moderación además: moderadoPor y reportes: [{ idReporte, motivo, fecha, reportadoPor, vivienda }] (solo los pendientes).
// Las listas paginadas responden { publicaciones | avisos, siguiente } y se piden con `antesDe` = siguiente.

const pagina = (antesDe) => ({ params: { limite: 50, ...(antesDe ? { antesDe } : {}) } });

// ---------- Muro que ven todos (vecinos y oficiales aprobados) ----------
export const listarMuro = (antesDe) => api('/muro', pagina(antesDe));

// ---------- Comunicados y normas (directiva: Administración, Presidencia, Tesorería y Secretaría) ----------
// Todas las oficiales, incluidas las que esperan aprobación o fueron devueltas
export const listarOficiales = () => api('/muro/oficiales');
// { tipo: 'Comunicado' | 'Norma', titulo, contenido } → publicación + { correos }. Desde la Presidencia se publica al tiro.
export const publicarOficial = (datos) => api('/muro/oficiales', { metodo: 'POST', cuerpo: datos });
// Presidencia: { aprobado, comentario? } → publicación + { correos }
export const decidirOficial = (idPublicacion, aprobado, comentario) =>
  api(`/muro/oficiales/${idPublicacion}/decision`, { metodo: 'POST', cuerpo: { aprobado, ...(comentario ? { comentario } : {}) } });
// Solo quien la publicó o la Presidencia
export const eliminarOficial = (idPublicacion) => api(`/muro/oficiales/${idPublicacion}`, { metodo: 'DELETE' });

// ---------- Moderación del muro (Administración) ----------
export const moderacionMuro = (antesDe) => api('/muro/moderacion', pagina(antesDe));
export const ocultarPublicacion = (id) => api(`/muro/${id}/ocultar`, { metodo: 'POST' });
export const restaurarPublicacion = (id) => api(`/muro/${id}/restaurar`, { metodo: 'POST' });
export const descartarReportesMuro = (id) => api(`/muro/${id}/reportes/descarte`, { metodo: 'POST' });

// ---------- Moderación del marketplace (Administración) ----------
// Aviso: { idProducto, tipo: 'Vendo' | 'Servicio' | 'Busco', titulo, descripcion, precio, fecha, cerradoEn,
//   autor: { idUsuario, nombre }, unidad: { idUnidad, numeroIdentificador, torre }, estadoModeracion, moderadoEn, moderadoPor, reportes }
export const moderacionMarketplace = (antesDe) => api('/marketplace/moderacion', pagina(antesDe));
export const ocultarAviso = (id) => api(`/marketplace/${id}/ocultar`, { metodo: 'POST' });
export const restaurarAviso = (id) => api(`/marketplace/${id}/restaurar`, { metodo: 'POST' });
export const descartarReportesAviso = (id) => api(`/marketplace/${id}/reportes/descarte`, { metodo: 'POST' });

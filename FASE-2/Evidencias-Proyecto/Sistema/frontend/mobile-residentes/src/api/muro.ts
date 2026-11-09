import { api } from './cliente';
import type { AvisoMercado, PaginaMercado, PaginaMuro, PublicacionMuro, SolicitudEnviada, SolicitudRecibida, Solicitudes, TipoAviso } from './tipos';

// Muro (muro.controller.ts, módulo «muro») y mercado vecinal (marketplace.controller.ts, módulo «marketplace»).
// Las listas son paginadas: { ..., siguiente } y la página que sigue se pide con `antesDe` = siguiente.

const pagina = (antesDe?: number | null, extra: Record<string, string> = {}) => ({ params: { limite: 30, ...(antesDe ? { antesDe } : {}), ...extra } });

// ---------- Muro ----------
export const MIN_MENSAJE = 5;
export const MAX_MENSAJE = 500;
export const MAX_MOTIVO = 255;
// Lo oficial aprobado, lo de vecinos publicado y lo propio (aunque lo hayan ocultado)
export const listarMuro = (antesDe?: number | null) => api<PaginaMuro>('/muro', pagina(antesDe));
export const publicar = (contenido: string, idUnidad: number) => api<PublicacionMuro>('/muro', { metodo: 'POST', cuerpo: { contenido, idUnidad } });
export const eliminarPublicacion = (id: number) => api<null>(`/muro/${id}`, { metodo: 'DELETE' });
export const reportarPublicacion = (id: number, motivo: string) => api<{ idReporte: number }>(`/muro/${id}/reportes`, { metodo: 'POST', cuerpo: { motivo } });

// ---------- Mercado ----------
export const MIN_TITULO_AVISO = 3;
export const MAX_TITULO_AVISO = 100;
export const MAX_DESCRIPCION_AVISO = 500;
export const PRECIO_MAXIMO = 99_999_999;
export const MAX_AVISOS_DISPONIBLES = 20;

export const listarAvisos = (antesDe?: number | null, tipo?: TipoAviso) => api<PaginaMercado>('/marketplace', pagina(antesDe, tipo ? { tipo } : {}));
export const aviso = (id: number) => api<AvisoMercado>(`/marketplace/${id}`);
export type DatosAviso = { titulo: string; descripcion?: string; precio?: number | null };
// Exige un teléfono en el perfil y menos de 20 avisos disponibles
export const publicarAviso = (datos: DatosAviso & { tipo: TipoAviso; idUnidad: number }) => api<AvisoMercado>('/marketplace', { metodo: 'POST', cuerpo: datos });
export const editarAviso = (id: number, datos: DatosAviso) => api<AvisoMercado>(`/marketplace/${id}`, { metodo: 'PUT', cuerpo: datos });
// Cerrar rechaza las solicitudes que esperan respuesta; reabrir las vuelve a dejar esperando
export const cerrarAviso = (id: number) => api<AvisoMercado>(`/marketplace/${id}/cierre`, { metodo: 'POST' });
export const reabrirAviso = (id: number) => api<AvisoMercado>(`/marketplace/${id}/cierre`, { metodo: 'DELETE' });
export const eliminarAviso = (id: number) => api<null>(`/marketplace/${id}`, { metodo: 'DELETE' });
export const reportarAviso = (id: number, motivo: string) => api<{ idReporte: number }>(`/marketplace/${id}/reportes`, { metodo: 'POST', cuerpo: { motivo } });

// Solicitudes de contacto: quien publicó acepta (se comparte su teléfono) o rechaza
export const solicitudes = () => api<Solicitudes>('/marketplace/solicitudes');
export const pedirContacto = (id: number, idUnidad: number) => api<SolicitudEnviada>(`/marketplace/${id}/solicitudes`, { metodo: 'POST', cuerpo: { idUnidad } });
export const cancelarSolicitud = (idSolicitud: number) => api<null>(`/marketplace/solicitudes/${idSolicitud}`, { metodo: 'DELETE' });
export const responderSolicitud = (idSolicitud: number, aceptada: boolean) =>
  api<SolicitudRecibida>(`/marketplace/solicitudes/${idSolicitud}/respuesta`, { metodo: 'POST', cuerpo: { aceptada } });
export const marcarRespuestaVista = (idSolicitud: number) => api<null>(`/marketplace/solicitudes/${idSolicitud}/vista`, { metodo: 'POST' });

// Motivos para reportar (texto libre en el backend, hasta 255 caracteres)
export const MOTIVOS_REPORTE = ['Lenguaje ofensivo', 'Acusación o datos de otro vecino', 'Posible estafa', 'Comercio fuera del mercado', 'Otro motivo'] as const;

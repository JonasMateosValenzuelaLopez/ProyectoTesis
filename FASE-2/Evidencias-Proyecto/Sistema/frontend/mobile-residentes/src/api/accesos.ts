import { api } from './cliente';
import type { Acceso, CategoriaAcceso, Invitacion } from './tipos';

// Invitaciones de visitas (invitaciones.controller.ts, módulo «invitaciones_qr»; crearlas exige además «conserjeria»)
// y autorizaciones de la garita (autorizaciones.controller.ts, módulo «conserjeria»).

// Reglas del backend (reglas-accesos.ts y los DTO)
export const MIN_NOMBRE_VISITA = 2;
export const MAX_NOMBRE_VISITA = 100;
export const MAX_DIAS_ANTICIPACION = 60;
export const MAX_INVITACIONES_VIGENTES = 30;
export const PATENTE = /^[A-Z0-9]{4,8}$/;
export const normalizarPatente = (texto: string) => texto.toUpperCase().replace(/[\s.·-]/g, '');

// Las de las viviendas de la persona, desde que vive ahí (hasta 100)
export const listarInvitaciones = () => api<{ invitaciones: Invitacion[] }>('/invitaciones');
export const invitacion = (id: number) => api<Invitacion>(`/invitaciones/${id}`);
// `validaDesde` y `validaHasta` en ISO 8601 con zona; dura hasta 24 horas y se crea con hasta 60 días de anticipación
export type DatosInvitacion = {
  nombre: string; rut?: string; categoria: CategoriaAcceso; patente?: string;
  validaDesde: string; validaHasta: string; idUnidad: number;
};
export const crearInvitacion = (datos: DatosInvitacion) => api<Invitacion>('/invitaciones', { metodo: 'POST', cuerpo: datos });
export const cancelarInvitacion = (id: number) => api<Invitacion>(`/invitaciones/${id}/cancelacion`, { metodo: 'POST' });

// Llegadas sin invitación a las viviendas de la persona que esperan su respuesta (de los últimos 30 minutos)
export const porAutorizar = () => api<{ porAutorizar: Acceso[] }>('/accesos/por-autorizar');
export const responderAcceso = (idAcceso: number, aprobado: boolean) =>
  api<Acceso>(`/accesos/${idAcceso}/respuesta`, { metodo: 'POST', cuerpo: { aprobado } });

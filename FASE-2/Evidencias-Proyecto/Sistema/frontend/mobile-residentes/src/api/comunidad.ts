import { api } from './cliente';
import type { ComunidadSolicitud, Contacto, Espacio, Guia, Mensaje, TipoResidencia } from './tipos';

// Guía de bienvenida, contactos y espacios de la comunidad de la vivienda elegida (van con `X-Red-Id`)
export const guia = () => api<Guia>('/comunidad/guia');
export const contactos = () => api<Contacto[]>('/comunidad/contactos');
export const espacios = () => api<Espacio[]>('/reservas/espacios');

// POST residencias/:id/guia-vista: la guía de bienvenida de esa vivienda queda vista (también al saltarla)
export const marcarGuiaVista = (idResidencia: number) => api<null>(`/residencias/${idResidencia}/guia-vista`, { metodo: 'POST' });

// Pedir acceso a una vivienda (públicos: la persona todavía no tiene cuenta)
export const comunidadesParaSolicitar = () => api<ComunidadSolicitud[]>('/solicitudes-acceso/comunidades', { publica: true });
export type DatosSolicitud = {
  idRed: number; identificador: string; nombre: string; primerApellido: string; segundoApellido?: string;
  correo: string; telefono?: string; numeroUnidad: string; tipoResidencia: TipoResidencia; mensaje?: string;
};
export const crearSolicitud = (datos: DatosSolicitud) => api<Mensaje>('/solicitudes-acceso', { metodo: 'POST', cuerpo: datos, publica: true });

import { api } from './cliente';
import type { FichaHogar, TipoFicha } from './tipos';

// Mi hogar (hogar.controller.ts): la libreta privada de cada vivienda. Solo la ven quienes viven en ella.
// Cada tipo de ficha usa campos distintos (reglas-ficha.ts); el backend rechaza los que no corresponden.

export const listarFichas = (idUnidad: number) => api<FichaHogar[]>(`/unidades/${idUnidad}/fichas`);
export type DatosFicha = {
  tipo: TipoFicha; titulo: string; detalle?: string; contactoNombre?: string; contactoTelefono?: string; fecha?: string; fechaVence?: string;
};
export const crearFicha = (idUnidad: number, datos: DatosFicha) => api<FichaHogar>(`/unidades/${idUnidad}/fichas`, { metodo: 'POST', cuerpo: datos });
export const actualizarFicha = (idFicha: number, datos: DatosFicha) => api<FichaHogar>(`/fichas/${idFicha}`, { metodo: 'PUT', cuerpo: datos });
// Solo Mantención: la última pasa a ser hoy y la próxima se corre con el mismo intervalo
export const registrarMantencion = (idFicha: number) => api<FichaHogar>(`/fichas/${idFicha}/mantencion`, { metodo: 'POST' });
export const eliminarFicha = (idFicha: number) => api<null>(`/fichas/${idFicha}`, { metodo: 'DELETE' });

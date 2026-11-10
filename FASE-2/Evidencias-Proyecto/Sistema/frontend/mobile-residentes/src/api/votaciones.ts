import { api } from './cliente';
import type { Acta, Votacion } from './tipos';

// Votaciones y actas del residente (votaciones.controller.ts y actas.controller.ts, módulo «votaciones»).

export const listarVotaciones = () => api<Votacion[]>('/votaciones');
// Una vivienda, un voto, a través de su titular. No se puede cambiar.
export const votar = (idVotacion: number, idOpcion: number, idUnidad: number) =>
  api<Votacion>(`/votaciones/${idVotacion}/votos`, { metodo: 'POST', cuerpo: { idOpcion, idUnidad } });

// El residente ve solo las actas publicadas
export const listarActas = () => api<Acta[]>('/actas');

// Columnas de texto de las actas: un elemento por línea
export const lineas = (texto: string | null) => (texto ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

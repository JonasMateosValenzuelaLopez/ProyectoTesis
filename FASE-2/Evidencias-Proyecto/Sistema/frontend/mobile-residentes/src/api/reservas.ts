import { api } from './cliente';
import type { Disponibilidad, Reserva } from './tipos';

// Reservas del residente (reservas.controller.ts). Exigen el módulo «reservas».
// Los espacios con sus horarios están en api/comunidad.ts (GET reservas/espacios).

// Reglas del backend (reglas-reservas.ts)
export const DIAS_PARA_RESERVAR = 14;
export const MAX_BLOQUES_POR_DIA = 2;
export const HORAS_PARA_CANCELAR = 24;
export const MAX_INVITADOS = 1000;
export const MOTIVO_BAJA = 'El espacio dejó de estar disponible';
export const MOTIVO_HORARIO = 'El horario reservado cambió o dejó de estar disponible';

// Estado de cada horario de un espacio en una fecha: 'Libre' | 'Reservado' | 'Pasado'
export const disponibilidad = (idEspacio: number, fecha: string) =>
  api<Disponibilidad>('/reservas/disponibilidad', { params: { idEspacio, fecha } });

// Las reservas de las viviendas de la persona (las últimas 100), con `puedeCancelar`
export const mias = () => api<Reserva[]>('/reservas/mias');

// Se confirma al tiro (nace «Aprobada»). La fecha va desde hoy hasta 14 días.
export type DatosReserva = { idEspacio: number; idUnidad: number; fecha: string; horaInicio: string; invitados?: number };
export const reservar = (datos: DatosReserva) => api<Reserva>('/reservas', { metodo: 'POST', cuerpo: datos });

// Hasta 24 horas antes y si no se entregó el espacio
export const cancelar = (idReserva: number) => api<Reserva>(`/reservas/${idReserva}/cancelacion`, { metodo: 'POST' });

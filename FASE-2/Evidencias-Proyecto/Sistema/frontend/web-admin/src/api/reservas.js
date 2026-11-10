import { api } from './cliente';

// Reservas de espacios comunes (reservas.controller.ts). Exigen el módulo «reservas».
// Los espacios (GET/PUT reservas/espacios) están en api/admin.js.
//
// Reserva: { idReserva, idEspacio, espacio, idUnidad, unidad: { idUnidad, numeroIdentificador, torre, callePasaje } | null,
//   usuario: { idUsuario, nombre }, fecha, horaInicio, horaFin, invitados,
//   estado: 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Cancelada' | 'Entregado' | 'Devuelto',
//   motivoCancelacion, observacionesRecepcion, entregadoEn, recibidoEn, fechaSolicitud }

// Administración: las reservas desde hoy (de todos los estados), opcionalmente de un espacio
export const listarReservas = (idEspacio) => api('/reservas', { params: idEspacio ? { idEspacio } : undefined });
// Con motivo: el residente recibe un correo → reserva + { residentesAvisados }
export const cancelarReserva = (idReserva, motivo) =>
  api(`/reservas/${idReserva}/cancelacion-administrativa`, { metodo: 'POST', cuerpo: { motivo } });

// Conserjería: { fecha, espacios: [{ idEspacio, nombre, activo, enUso: idReserva | null, reservas: [reserva], porRecibir: [reserva] }] }
// `porRecibir` son reservas de días anteriores que se entregaron y no se han recibido.
export const reservasDelDia = () => api('/reservas/hoy');
export const entregarEspacio = (idReserva) => api(`/reservas/${idReserva}/entrega`, { metodo: 'POST' });
// Sin observaciones, el backend guarda «Sin novedades»
export const recibirEspacio = (idReserva, observaciones) =>
  api(`/reservas/${idReserva}/recepcion`, { metodo: 'POST', cuerpo: observaciones ? { observaciones } : {} });

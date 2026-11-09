import { api } from './cliente';

// Votaciones y actas (votaciones.controller.ts y actas.controller.ts, módulo «votaciones»).
// Crean, cierran y redactan la Secretaría y la Presidencia.
//
// Votación: { idVotacion, tipo: 'Votación' | 'Encuesta', titulo, descripcion, quorum, inicio, fechaCierre,
//   estado: 'Abierta' | 'Cerrada', totalUnidades, opciones: [{ idOpcion, texto, votos }],
//   resultado: { votos, participacion, faltan, alcanzaQuorum, idOpcionGanadora } (la ganadora solo al cerrar),
//   misVotos, puedeVotarPor, recordatorios, unidadesSinTitular }

export const listarVotaciones = () => api('/votaciones');
// { tipo, titulo, descripcion?, opciones: [texto], fechaCierre, quorum? } → votación. Avisa por correo a los titulares.
export const crearVotacion = (datos) => api('/votaciones', { metodo: 'POST', cuerpo: datos });
export const cerrarVotacion = (idVotacion) => api(`/votaciones/${idVotacion}/cierre`, { metodo: 'POST' });
// Correo a los titulares de las viviendas que faltan → { destinatarios, correosEnviados }
export const recordarVotacion = (idVotacion) => api(`/votaciones/${idVotacion}/recordatorio`, { metodo: 'POST' });

// Acta: { idActa, numero, titulo, tipo: 'Reunión de directiva' | 'Asamblea ordinaria' | 'Asamblea extraordinaria',
//   fecha, lugar, unidadesPresentes, asistentes, temas, estado: 'Borrador' | 'Publicada', publicadaEn,
//   redactor: { idUsuario, nombre }, acuerdos: [{ idAcuerdo, texto, responsable, plazo }] }
export const listarActas = () => api('/actas');
// { tipo, fecha, lugar, unidadesPresentes?, asistentes?, temas, acuerdos: [{ texto, responsable?, plazo? }] } → acta (borrador)
export const crearActa = (datos) => api('/actas', { metodo: 'POST', cuerpo: datos });
// Solo un borrador
export const editarActa = (idActa, datos) => api(`/actas/${idActa}`, { metodo: 'PUT', cuerpo: datos });
export const publicarActa = (idActa) => api(`/actas/${idActa}/publicacion`, { metodo: 'POST' });
export const eliminarActa = (idActa) => api(`/actas/${idActa}`, { metodo: 'DELETE' });

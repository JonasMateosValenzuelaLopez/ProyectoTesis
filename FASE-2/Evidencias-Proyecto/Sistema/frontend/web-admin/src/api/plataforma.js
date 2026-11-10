import { api } from './cliente';

// Endpoints del equipo EntreCasas (plataforma.controller.ts y bitacora-plataforma.controller.ts).
// No llevan `X-Red-Id`: la comunidad va en la ruta.

// [{ idRed, nombre, tipo, direccion, estado, motivoSuspension, fechaCreacion, ultimaActividad,
//    totalUnidades, totalPersonas, modulos, responsable: { idUsuario, nombre, pais, identificador, correo, cargo } | null }]
export const listarComunidades = () => api('/plataforma/comunidades', { sinRed: true });

// Lo mismo de la lista, más `unidades` y `directiva` ([{ ...persona, cargos: ['Presidente', ...] }]).
// Abrir la ficha queda en la bitácora de plataforma.
export const fichaComunidad = (idRed) => api(`/plataforma/comunidades/${idRed}`, { sinRed: true });

// { nombre, direccion, tipo, estructura, modulos, espacios, responsable } → resumen de la comunidad + `correoEnviado`
export const crearComunidad = (datos) => api('/plataforma/comunidades', { metodo: 'POST', cuerpo: datos, sinRed: true });

export const suspenderComunidad = (idRed, motivo) =>
  api(`/plataforma/comunidades/${idRed}/suspension`, { metodo: 'POST', cuerpo: { motivo }, sinRed: true });

export const reactivarComunidad = (idRed) =>
  api(`/plataforma/comunidades/${idRed}/suspension`, { metodo: 'DELETE', sinRed: true });

export const cambiarModulo = (idRed, codigoModulo, activo) =>
  api(`/plataforma/comunidades/${idRed}/modulos/${codigoModulo}`, { metodo: 'PUT', cuerpo: { activo }, sinRed: true });

export const cambiarTipo = (idRed, tipo) =>
  api(`/plataforma/comunidades/${idRed}/tipo`, { metodo: 'PUT', cuerpo: { tipo }, sinRed: true });

// { registros: [{ idBitacora, fecha, accion, entidad, idEntidad, detalle, comunidad, usuario }], siguiente }
// `comunidad`: id de una comunidad o 'ninguna'; `antesDe`: el `siguiente` de la página anterior
export const bitacoraPlataforma = ({ comunidad, antesDe, limite } = {}) =>
  api('/plataforma/bitacora', { params: { comunidad, antesDe, limite }, sinRed: true });

// ---------- Personas (personas-plataforma.controller.ts) ----------
// { buscar?, filtro?: 'todas' | 'bloqueadas' | 'plataforma', antesDe? } → { personas, siguiente }, de la más nueva a la más antigua.
// Persona: { idUsuario, identificador, pais, nombre, correo, telefono, esPlataforma, bloqueado, motivoBloqueo,
//   accesoActivado (false = nunca creó contraseña), fechaCreacion, comunidades: [{ idRed, nombre, estado, cargos: ['Presidente', ...] }] }
export const listarPersonas = ({ buscar, filtro, antesDe } = {}) =>
  api('/plataforma/personas', { params: { limite: 50, buscar, filtro: filtro === 'todas' ? undefined : filtro, antesDe }, sinRed: true });
// Motivo de 1 a 255 caracteres → persona actualizada. No se puede bloquear la propia cuenta.
export const bloquearPersona = (idUsuario, motivo) =>
  api(`/plataforma/personas/${idUsuario}/bloqueo`, { metodo: 'POST', cuerpo: { motivo }, sinRed: true });
export const desbloquearPersona = (idUsuario) => api(`/plataforma/personas/${idUsuario}/bloqueo`, { metodo: 'DELETE', sinRed: true });
// Sin contraseña: enlace de activación (3 días); con contraseña: de recuperación (1 hora) → { tipo: 'Activacion' | 'Recuperacion', correoEnviado }
export const reenviarAcceso = (idUsuario) => api(`/plataforma/personas/${idUsuario}/acceso`, { metodo: 'POST', sinRed: true });

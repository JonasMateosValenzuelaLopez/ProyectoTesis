import { api } from './cliente';

// Garita (porteria.controller.ts) y conservación de registros (retenciones.controller.ts). Exigen el módulo
// «conserjeria»; la garita la usan Conserjería y Administración, las retenciones solo Administración.
//
// Invitación (vista de garita): { idInvitacion, nombreVisita, rut, categoria: 'Visita' | 'Proveedor' | 'Servicio' | 'Delivery',
//   patente, validaDesde, validaHasta, canceladaEn, estado: 'Esperada' | 'Adentro' | 'Salió' | 'Cancelada' | 'Vencida',
//   idAcceso, ingresoEn, salidaEn, unidad: { idUnidad, numeroIdentificador, torre }, invitadaPor: { idUsuario, nombre } }
// Acceso: { idAcceso, visitante, categoria, patente, unidad, idInvitacion,
//   estadoAutorizacion: 'Aprobado' | 'Rechazado' | 'Pendiente de Confirmación', autorizadoVia: 'Invitación' | 'App' | 'Teléfono' | null,
//   autorizadoPor, registradoPor, metodo: 'QR' | 'Manual', llegada, ingresoEn, salidaEn }

// { esperadas: [invitación], adentro: [acceso], porAutorizar: [acceso] (de los últimos 30 minutos) }
export const resumen = () => api('/porteria/resumen');
// Historial de ingresos (lo último primero) → { accesos, siguiente }
export const monitor = (antesDe) => api('/porteria/accesos', { params: { limite: 50, ...(antesDe ? { antesDe } : {}) } });
// Por RUT, nombre, unidad o patente (desde 2 caracteres) → { resultados: [{ unidad, residentes: [{ idUsuario, nombre,
//   tipoResidencia, telefono }], vehiculos: [{ patente, marca, modelo, color, estacionamiento }] }] } (hasta 8)
export const buscar = (q) => api('/porteria/busqueda', { params: { q } });

// Revisar un código sin registrar nada → { resultado: 'valido' | 'temprano' | 'vencido' | 'usado' | 'adentro'
//   | 'cancelada' | 'sin_invitante' | 'no_existe', invitacion | null }
export const validar = (codigo) => api('/porteria/validacion', { metodo: 'POST', cuerpo: { codigo } });
// Registrar el ingreso con el código (QR) → acceso
export const ingresoConCodigo = (codigo) => api('/porteria/ingresos', { metodo: 'POST', cuerpo: { codigo } });
// Registrar el ingreso desde la lista de esperadas (Manual) → acceso
export const ingresoPorInvitacion = (idInvitacion) => api(`/porteria/invitaciones/${idInvitacion}/ingreso`, { metodo: 'POST' });
// Llegada sin invitación: queda esperando que el residente autorice → acceso
// { nombre, rut?, categoria, patente?, idUnidad }
export const ingresoSinInvitacion = (datos) => api('/porteria/accesos', { metodo: 'POST', cuerpo: datos });
export const registrarSalida = (idAcceso) => api(`/porteria/accesos/${idAcceso}/salida`, { metodo: 'POST' });
// Lo que dijo el residente por WhatsApp o teléfono → acceso
export const resolverPorTelefono = (idAcceso, aprobado) => api(`/porteria/accesos/${idAcceso}/autorizacion`, { metodo: 'POST', cuerpo: { aprobado } });

// ---------- Conservación (Ley 21.719) ----------
// { conservacionMeses, retenciones: [{ idRetencion, desde, hasta, motivo, activa, creadaEn, creadaPor, liberadaEn, liberadaPor }] }
export const listarRetenciones = () => api('/porteria/retenciones');
export const crearRetencion = (datos) => api('/porteria/retenciones', { metodo: 'POST', cuerpo: datos });
export const liberarRetencion = (idRetencion) => api(`/porteria/retenciones/${idRetencion}/liberacion`, { metodo: 'POST' });

import { api } from './cliente';

// Endpoints de administración de una comunidad (van con `X-Red-Id`). Responden con los nombres del backend.

// ---------- Unidades (unidades.controller.ts) ----------
// [{ idUnidad, numeroIdentificador, tipo, callePasaje, torre, piso, manzana, orden, estacionamiento,
//    ocupantes: [{ idUsuario, nombre, tipoResidencia, titular }] }]
export const listarUnidades = () => api('/unidades');
// Edificio: { torre, pisoDesde, pisoHasta, porPiso }; condominio y villa: { grupo, desde, hasta } → { creadas, omitidas }
export const crearLoteUnidades = (lote) => api('/unidades/lote', { metodo: 'POST', cuerpo: lote });
export const editarUnidad = (idUnidad, numeroIdentificador) => api(`/unidades/${idUnidad}`, { metodo: 'PATCH', cuerpo: { numeroIdentificador } });
// → { idUnidad, idUsuarioTitular }
export const cambiarTitular = (idUnidad, idUsuario) => api(`/unidades/${idUnidad}/titular`, { metodo: 'PUT', cuerpo: { idUsuario } });

// ---------- Residentes y cargos (residentes.controller.ts) ----------
// [{ idUsuario, nombre, primerApellido, segundoApellido, pais, identificador, correo, telefono,
//    estado: 'Activo' | 'Invitado' | 'Desactivado', enComunidadDesde,
//    viviendas: [{ idResidencia, idUnidad, numeroIdentificador, callePasaje, tipoResidencia }],
//    cargos: [{ idRol, cargo, desde, hasta }] }]
export const listarResidentes = () => api('/residentes');
// { identificador, nombre, primerApellido, segundoApellido?, correo, telefono?, idUnidad, tipoResidencia } → persona + correoEnviado
export const invitarResidente = (datos) => api('/residentes', { metodo: 'POST', cuerpo: datos });
// → { correoEnviado }
export const reenviarInvitacion = (idUsuario) => api(`/residentes/${idUsuario}/invitacion`, { metodo: 'POST' });
// Cada una devuelve la persona actualizada
export const asignarCargo = (idUsuario, idRol, hasta) =>
  api(`/residentes/${idUsuario}/cargos`, { metodo: 'POST', cuerpo: { idRol, ...(hasta ? { hasta } : {}) } });
export const quitarCargo = (idUsuario, idRol) => api(`/residentes/${idUsuario}/cargos/${idRol}`, { metodo: 'DELETE' });
export const desactivarPersona = (idUsuario) => api(`/residentes/${idUsuario}/desactivacion`, { metodo: 'POST' });
export const reactivarPersona = (idUsuario) => api(`/residentes/${idUsuario}/desactivacion`, { metodo: 'DELETE' });

// ---------- Solicitudes de acceso (solicitudes-acceso.controller.ts) ----------
// [{ idSolicitud, idUnidad, unidad, numeroUnidad, tipoResidencia, identificador, pais, nombre, primerApellido,
//    segundoApellido, correo, telefono, mensaje, estado, motivoRechazo, fechaSolicitud, ... }]
export const listarSolicitudes = (estado = 'Pendiente') => api('/solicitudes-acceso', { params: { estado } });
// Si la solicitud no calzó con una unidad, hay que indicar `idUnidad`
export const aprobarSolicitud = (idSolicitud, datos = {}) => api(`/solicitudes-acceso/${idSolicitud}/aprobar`, { metodo: 'PATCH', cuerpo: datos });
export const rechazarSolicitud = (idSolicitud, motivo) =>
  api(`/solicitudes-acceso/${idSolicitud}/rechazar`, { metodo: 'PATCH', cuerpo: motivo ? { motivo } : {} });

// Públicos: la persona que pide acceso todavía no tiene cuenta
export const comunidadesParaSolicitar = () => api('/solicitudes-acceso/comunidades', { publica: true });
export const crearSolicitud = (datos) => api('/solicitudes-acceso', { metodo: 'POST', cuerpo: datos, publica: true });

// ---------- Datos de la comunidad (datos-comunidad.controller.ts) ----------
// { idRed, nombre, tipo, direccion, banco, tipoCuenta, numeroCuenta, titularCuenta, identificadorTitular,
//   correoTransferencias, umbralVisado }
export const datosComunidad = () => api('/comunidad/datos');
export const guardarDatosComunidad = (datos) => api('/comunidad/datos', { metodo: 'PUT', cuerpo: datos });
export const cambiarUmbralVisado = (umbralVisado) => api('/comunidad/umbral-visado', { metodo: 'PUT', cuerpo: { umbralVisado } });

// ---------- Espacios comunes (espacios.controller.ts) ----------
// [{ idEspacio, nombre, descripcion, capacidad, bloques: [{ idBloque, horaInicio, horaFin }] }]
export const listarEspacios = () => api('/reservas/espacios');
// { espacios: [...] } (la lista completa) → { espacios, reservasCanceladas, reservasSinAviso }
export const guardarEspacios = (datos) => api('/reservas/espacios', { metodo: 'PUT', cuerpo: datos });

// ---------- Guía de bienvenida y contactos (guia.controller.ts y contactos.controller.ts) ----------
// { mensaje, basuraDias, basuraHorario, basuraLugar, reciclajeLugar, reciclajeDetalle, firma, fechaActualizacion }
export const guia = () => api('/comunidad/guia');
export const guardarGuia = (datos) => api('/comunidad/guia', { metodo: 'PUT', cuerpo: datos });
// [{ idContacto, nombre, detalle, telefono, horario, visible }] (quien no edita ve solo los visibles)
export const listarContactos = () => api('/comunidad/contactos');
export const crearContacto = (datos) => api('/comunidad/contactos', { metodo: 'POST', cuerpo: datos });
export const actualizarContacto = (idContacto, datos) => api(`/comunidad/contactos/${idContacto}`, { metodo: 'PUT', cuerpo: datos });
export const eliminarContacto = (idContacto) => api(`/comunidad/contactos/${idContacto}`, { metodo: 'DELETE' });

// ---------- Módulos de la comunidad (modulos-comunidad.controller.ts) ----------
// Los 8 módulos: [{ codigo, nombre, descripcion, activo, editable }]. `administrador_externo` viene con
// editable: false (solo lo cambia el equipo EntreCasas).
export const listarModulos = () => api('/comunidad/modulos');
// → la lista actualizada. El menú cambia desde la petición siguiente (el perfil trae los módulos activos).
export const cambiarModuloComunidad = (codigo, activo) => api(`/comunidad/modulos/${codigo}`, { metodo: 'PUT', cuerpo: { activo } });

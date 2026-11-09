// Tipos de las respuestas de la API, con los mismos nombres del backend (auth.service.ts › serializarUsuario,
// comunidadesDe). Cada módulo agrega los suyos al conectarse.

// Igual al enum `RolUsuario` del backend (common/enums/rol.enum.ts)
export const RolUsuario = {
  ADMINISTRADOR: 1,
  TESORERO: 2,
  SECRETARIO: 3,
  PRESIDENTE: 4,
  CONSERJE: 5,
  RESIDENTE: 6,
} as const;
export type IdRol = (typeof RolUsuario)[keyof typeof RolUsuario];

// Algunas respuestas traen el cargo por su nombre (`NOMBRE_ROL` del backend)
export const ID_ROL_POR_NOMBRE: Record<string, IdRol> = {
  Administrador: RolUsuario.ADMINISTRADOR, Tesorero: RolUsuario.TESORERO, Secretario: RolUsuario.SECRETARIO,
  Presidente: RolUsuario.PRESIDENTE, Conserje: RolUsuario.CONSERJE, Residente: RolUsuario.RESIDENTE,
};

// Igual al enum `CodigoModulo` del backend (common/enums/modulo.enum.ts)
export type CodigoModulo = 'muro' | 'marketplace' | 'votaciones' | 'reservas' | 'cobros' | 'invitaciones_qr' | 'conserjeria' | 'administrador_externo';

export type TipoRedVecinal = 'Villa' | 'Condominio' | 'Edificio';
export type TipoUnidad = 'Casa' | 'Departamento';
export type TipoResidencia = 'Propietario' | 'Arrendatario';

// Una vivienda donde vive la persona (`comunidades[].unidades` del perfil)
export type UnidadPerfil = {
  idResidencia: number;
  idUnidad: number;
  numeroIdentificador: string;
  tipoUnidad: TipoUnidad;
  tipoResidencia: TipoResidencia;
  fechaGuiaVista: string | null;
};

export type ComunidadPerfil = {
  idRed: number;
  nombre: string;
  tipo: TipoRedVecinal;
  roles: { idRol: IdRol; nombre: string }[];
  presidenteAdministra: boolean;
  modulos: CodigoModulo[];
  unidades: UnidadPerfil[];
};

// GET auth/perfil
export type Perfil = {
  idUsuario: number;
  identificador: string;
  pais: string;
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  telefono: string | null;
  esPlataforma: boolean;
  tutorialAppVisto: boolean;
  tutorialPanelVisto: boolean;
  comunidades: ComunidadPerfil[];
};

// POST auth/login, auth/codigo/verificar y PUT auth/perfil/password
export type Sesion = { accessToken: string; tokenType: 'Bearer'; usuario: Perfil };

export type Mensaje = { mensaje: string };

// ---------- Comunidad ----------
export type DiaSemana = 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';

// GET comunidad/guia
export type Guia = {
  mensaje: string | null;
  basuraDias: DiaSemana[];
  basuraHorario: string | null;
  basuraLugar: string | null;
  reciclajeLugar: string | null;
  reciclajeDetalle: string | null;
  firma: { nombre: string; cargo: string | null } | null;
  fechaActualizacion: string | null;
};

// GET comunidad/contactos (el residente ve solo los visibles)
export type Contacto = { idContacto: number; nombre: string; detalle: string | null; telefono: string; horario: string | null; visible: boolean };

// GET reservas/espacios
export type Bloque = { idBloque: number; horaInicio: string; horaFin: string };
export type Espacio = { idEspacio: number; nombre: string; descripcion: string | null; capacidad: number | null; bloques: Bloque[] };

// GET solicitudes-acceso/comunidades (público)
export type ComunidadSolicitud = { idRed: number; nombre: string; tipo: TipoRedVecinal };

// ---------- Finanzas (GET finanzas/mi-cuenta) ----------
export type EstadoCobroUnidad = 'Pendiente' | 'Pagado' | 'Exento';
export type EstadoAviso = 'Pendiente' | 'Validado' | 'Rechazado';
export type EstadoExencion = 'Pendiente' | 'Por aprobar' | 'Aprobada' | 'Rechazada';

export type AvisoPago = {
  idAviso: number; idCobroUnidad: number; monto: number; fechaPago: string; observacion: string | null;
  estado: EstadoAviso; motivoRechazo: string | null; avisadoPor: { idUsuario: number; nombre: string } | null;
};

export type CobroCuenta = {
  idCobroUnidad: number; idCobro: number; concepto: string; periodo: string; fechaVencimiento: string; extraordinario: boolean;
  monto: number; estado: EstadoCobroUnidad; atrasado: boolean; pagadoMarcadoEn: string | null;
  exencion: { idExencion: number; estado: EstadoExencion } | null;
  avisos: AvisoPago[];
};

// Cuenta de una unidad: `deudaAtrasada` son los cobros pendientes ya vencidos
export type CuentaUnidad = {
  idUnidad: number; numeroIdentificador: string; callePasaje: string | null;
  deudaAtrasada: number; pendienteNoVencido: number; total: number;
  cobros: CobroCuenta[];
};

// Columnas bancarias de la comunidad: pueden venir vacías en una comunidad recién creada
export type DatosTransferencia = {
  banco: string | null; tipoCuenta: string | null; numeroCuenta: string | null;
  titularCuenta: string | null; identificadorTitular: string | null; correoTransferencias: string | null;
};

export type MiCuenta = { datosTransferencia: DatosTransferencia; unidades: CuentaUnidad[] };

// ---------- Reservas ----------
// `estado` visible: 'Entregado' (en uso) y 'Devuelto' salen de las horas de entrega y recepción en conserjería
export type EstadoReserva = 'Pendiente' | 'Aprobada' | 'Rechazada' | 'Cancelada' | 'Entregado' | 'Devuelto';

export type Reserva = {
  idReserva: number; idEspacio: number; espacio: string | null; idUnidad: number;
  unidad: { idUnidad: number; numeroIdentificador: string; torre: string | null; callePasaje: string | null } | null;
  usuario: { idUsuario: number; nombre: string | null };
  fecha: string; horaInicio: string; horaFin: string; invitados: number; estado: EstadoReserva;
  motivoCancelacion: string | null; observacionesRecepcion: string | null;
  entregadoEn: string | null; recibidoEn: string | null; fechaSolicitud: string;
  // Solo en GET reservas/mias
  puedeCancelar?: boolean;
};

// ---------- Muro ----------
export type Persona = { idUsuario: number; nombre: string | null };
export type PublicacionMuro = {
  idPublicacion: number; tipo: 'Comunicado' | 'Norma' | 'Vecino'; titulo: string | null; contenido: string; fecha: string;
  autor: (Persona & { cargo: string | null }) | null;
  unidad: { idUnidad: number; numeroIdentificador: string } | null;
  estadoAprobacion: 'No requiere' | 'Pendiente' | 'Aprobada' | 'Rechazada';
  aprobadoPor: (Persona & { cargo: string | null }) | null; aprobadoEn: string | null;
  estadoModeracion: 'Publicada' | 'Oculta'; moderadoEn: string | null;
  esMia: boolean; reportadaPorMi: boolean;
};
export type PaginaMuro = { publicaciones: PublicacionMuro[]; siguiente: number | null };

// ---------- Mercado ----------
export type TipoAviso = 'Vendo' | 'Servicio' | 'Busco';
export type EstadoSolicitudContacto = 'Pendiente' | 'Aceptada' | 'Rechazada';
export type AvisoMercado = {
  idProducto: number; tipo: TipoAviso; titulo: string; descripcion: string | null; precio: number | null;
  fecha: string; cerradoEn: string | null; autor: Persona | null;
  unidad: { idUnidad: number; numeroIdentificador: string; torre: string | null } | null;
  estadoModeracion: 'Publicada' | 'Oculta'; moderadoEn: string | null;
  esMia: boolean; reportadaPorMi: boolean;
  // La solicitud de contacto de la persona por este aviso (null si es suyo o no la pidió)
  miSolicitud: { idSolicitud: number; estado: EstadoSolicitudContacto; fecha: string; respondidaEn: string | null; vista: boolean; telefono: string | null } | null;
};
export type PaginaMercado = { avisos: AvisoMercado[]; siguiente: number | null };
export type SolicitudRecibida = {
  idSolicitud: number; estado: EstadoSolicitudContacto; fecha: string; respondidaEn: string | null;
  aviso: { idProducto: number; titulo: string }; interesado: Persona | null;
  unidad: { idUnidad: number; numeroIdentificador: string; torre: string | null } | null;
};
export type SolicitudEnviada = {
  idSolicitud: number; estado: EstadoSolicitudContacto; fecha: string; respondidaEn: string | null; vista: boolean;
  aviso: { idProducto: number; titulo: string; tipo: TipoAviso }; autor: Persona | null; telefono: string | null;
};
export type Solicitudes = { recibidas: SolicitudRecibida[]; enviadas: SolicitudEnviada[] };

// ---------- Votaciones y actas ----------
// Los votos por opción y el resultado llegan solo si la vivienda ya votó o la votación cerró
export type Votacion = {
  idVotacion: number; tipo: 'Votación' | 'Encuesta'; titulo: string; descripcion: string | null; quorum: number | null;
  inicio: string; fechaCierre: string; estado: 'Abierta' | 'Cerrada'; totalUnidades: number;
  opciones: { idOpcion: number; texto: string; votos: number | null }[];
  resultado: { votos: number; participacion: number; faltan: number; alcanzaQuorum: boolean; idOpcionGanadora: number | null } | null;
  misVotos: { idUnidad: number; idOpcion: number }[];
  // Viviendas de la persona donde es titular y aún no votan
  puedeVotarPor: number[];
};
export type Acta = {
  idActa: number; numero: number; titulo: string; tipo: 'Reunión de directiva' | 'Asamblea ordinaria' | 'Asamblea extraordinaria';
  fecha: string; lugar: string; unidadesPresentes: number | null; asistentes: string | null; temas: string;
  estado: 'Borrador' | 'Publicada'; publicadaEn: string | null; redactor: Persona | null;
  acuerdos: { idAcuerdo: number; texto: string; responsable: string | null; plazo: string | null }[];
};

// ---------- Invitaciones y portería ----------
export type CategoriaAcceso = 'Visita' | 'Proveedor' | 'Servicio' | 'Delivery';
export type EstadoInvitacion = 'Esperada' | 'Adentro' | 'Salió' | 'Cancelada' | 'Vencida';
// El código solo llega a quien creó la invitación; el RUT no llega al resto de la vivienda
export type Invitacion = {
  idInvitacion: number; codigo?: string; nombreVisita: string; rut: string | null; categoria: CategoriaAcceso; patente: string | null;
  validaDesde: string; validaHasta: string; canceladaEn: string | null; estado: EstadoInvitacion;
  idAcceso: number | null; ingresoEn: string | null; salidaEn: string | null;
  unidad: { idUnidad: number; numeroIdentificador: string; torre: string | null } | null;
  invitadaPor: Persona | null;
};
// Una llegada a la garita (sin invitación) que espera la autorización de la vivienda
export type Acceso = {
  idAcceso: number; visitante: string | null; categoria: CategoriaAcceso; patente: string | null;
  unidad: { idUnidad: number; numeroIdentificador: string; torre: string | null } | null; idInvitacion: number | null;
  estadoAutorizacion: 'Aprobado' | 'Rechazado' | 'Pendiente de Confirmación'; autorizadoVia: 'Invitación' | 'App' | 'Teléfono' | null;
  llegada: string; ingresoEn: string | null; salidaEn: string | null;
};

// ---------- Mi hogar (fichas privadas de la vivienda) ----------
export type TipoFicha = 'Pintura' | 'Garantía' | 'Mantención' | 'Medida' | 'Técnico' | 'Otro';
export type FichaHogar = {
  idFicha: number; idUnidad: number; tipo: TipoFicha; titulo: string; detalle: string | null;
  contactoNombre: string | null; contactoTelefono: string | null; fecha: string | null; fechaVence: string | null;
  creadoPor: Persona | null; fechaCreacion: string; fechaActualizacion: string;
};

export type Disponibilidad = {
  idEspacio: number; fecha: string;
  bloques: { idBloque: number; horaInicio: string; horaFin: string; estado: 'Libre' | 'Reservado' | 'Pasado' }[];
};

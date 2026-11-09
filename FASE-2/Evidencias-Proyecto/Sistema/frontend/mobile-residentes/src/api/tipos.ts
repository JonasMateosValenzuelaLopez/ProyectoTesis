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

// ---------- Comunidad (fase 3) ----------
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

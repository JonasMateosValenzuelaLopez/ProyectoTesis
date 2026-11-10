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

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Cliente de la API de EntreCasas. Todas las llamadas de la app pasan por aquí:
// agrega el token (`Authorization: Bearer`), la comunidad de la vivienda elegida (`X-Red-Id`)
// y convierte las respuestas de error del backend ({ statusCode, codigo, mensaje, campos, idSolicitud })
// en un ErrorApi que las pantallas muestran tal cual.

// En el celular no sirve `localhost`: se usa la IP de Tailscale del equipo con el backend (ver .env.example)
const URL_API = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const CLAVE_TOKEN = 'entrecasas.token';

// El token se guarda cifrado en el teléfono. En Expo web no hay almacenamiento seguro: vive solo en memoria.
const almacen = {
  leer: async () => (Platform.OS === 'web' ? null : SecureStore.getItemAsync(CLAVE_TOKEN)),
  guardar: async (valor: string | null) => {
    if (Platform.OS === 'web') return;
    if (valor) await SecureStore.setItemAsync(CLAVE_TOKEN, valor);
    else await SecureStore.deleteItemAsync(CLAVE_TOKEN);
  },
};

let token: string | null = null;
let idRed: number | null = null;
let alExpirar: ((error: ErrorApi) => void) | null = null;

export class ErrorApi extends Error {
  statusCode: number;
  codigo: string;
  campos: Record<string, string> | null;
  idSolicitud: string | null;
  constructor({ statusCode = 0, codigo = 'ERROR_INTERNO', mensaje, campos = null, idSolicitud = null }:
    { statusCode?: number; codigo?: string; mensaje: string; campos?: Record<string, string> | null; idSolicitud?: string | null }) {
    super(mensaje);
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.campos = campos;
    this.idSolicitud = idSolicitud;
  }
}

// Mensaje para mostrar de cualquier error (de la API o inesperado)
export const mensajeDe = (error: unknown) => (error instanceof Error ? error.message : 'Algo salió mal. Intenta de nuevo.');

export const sesionApi = {
  // Recupera el token guardado al abrir la app
  cargar: async () => {
    token = await almacen.leer().catch(() => null);
    return token;
  },
  guardarToken: async (nuevo: string | null) => {
    token = nuevo;
    await almacen.guardar(nuevo).catch(() => { /* queda en memoria */ });
  },
  // Comunidad que va en `X-Red-Id` (la de la vivienda con que actúa la persona)
  usarRed: (id: number | null) => { idRed = id; },
  // La sesión decide qué hacer cuando el token vence o deja de servir (401)
  alExpirar: (fn: (error: ErrorApi) => void) => { alExpirar = fn; },
};

type Opciones = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cuerpo?: unknown;
  params?: Record<string, string | number | boolean | null | undefined>;
  // No envía token ni trata el 401 como sesión vencida (login, código, solicitar acceso)
  publica?: boolean;
  // No envía `X-Red-Id` (perfil y Mis datos)
  sinRed?: boolean;
};

const consulta = (params?: Opciones['params']) => {
  if (!params) return '';
  const pares = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return pares.length ? `?${pares.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&')}` : '';
};

export async function api<T>(ruta: string, { metodo = 'GET', cuerpo, params, publica = false, sinRed = false }: Opciones = {}): Promise<T> {
  const cabeceras: Record<string, string> = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (!publica && token) cabeceras.Authorization = `Bearer ${token}`;
  if (!publica && !sinRed && idRed) cabeceras['X-Red-Id'] = String(idRed);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${URL_API}${ruta}${consulta(params)}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ErrorApi({ mensaje: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.' });
  }

  if (respuesta.status === 204) return null as T;
  const datos = await respuesta.json().catch(() => null);
  if (respuesta.ok) return datos as T;

  const error = new ErrorApi({
    statusCode: respuesta.status,
    codigo: datos?.codigo,
    mensaje: datos?.mensaje ?? 'Algo salió mal. Intenta de nuevo.',
    campos: datos?.campos ?? null,
    idSolicitud: datos?.idSolicitud ?? respuesta.headers.get('x-request-id'),
  });
  if (respuesta.status === 401 && !publica && alExpirar) alExpirar(error);
  throw error;
}

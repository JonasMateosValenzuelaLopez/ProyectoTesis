// Cliente de la API de EntreCasas. Todas las llamadas del panel pasan por aquí:
// agrega el token (`Authorization: Bearer`), la comunidad con la que se trabaja (`X-Red-Id`)
// y convierte las respuestas de error del backend ({ statusCode, codigo, mensaje, campos, idSolicitud })
// en un ErrorApi que las pantallas muestran tal cual.

const URL_API = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const CLAVE_TOKEN = 'entrecasas.token';

const leerToken = () => {
  try { return sessionStorage.getItem(CLAVE_TOKEN); } catch { return null; }
};

let token = leerToken();
let idRed = null;
let alExpirar = null;

export class ErrorApi extends Error {
  constructor({ statusCode = 0, codigo = 'ERROR_INTERNO', mensaje, campos = null, idSolicitud = null }) {
    super(mensaje);
    this.statusCode = statusCode;
    this.codigo = codigo;
    this.campos = campos;
    this.idSolicitud = idSolicitud;
  }
}

export const sesionApi = {
  token: () => token,
  guardarToken: (nuevo) => {
    token = nuevo;
    try {
      if (nuevo) sessionStorage.setItem(CLAVE_TOKEN, nuevo);
      else sessionStorage.removeItem(CLAVE_TOKEN);
    } catch { /* sin almacenamiento: el token vive solo en memoria */ }
  },
  // Comunidad que va en `X-Red-Id` (null en Plataforma y antes de elegir)
  usarRed: (id) => { idRed = id; },
  // La sesión decide qué hacer cuando el token vence o deja de servir (401)
  alExpirar: (fn) => { alExpirar = fn; },
};

// Cancelación: `useConsulta` ejecuta sus pedidos dentro de `conSenal(señal, fn)`; cada `api()` que empieza en
// ese momento toma la señal y se corta si la pantalla se cierra o cambia la consulta (un filtro, otra comunidad).
let senalActual = null;
export function conSenal(senal, fn) {
  const previa = senalActual;
  senalActual = senal;
  try { return fn(); } finally { senalActual = previa; }
}

const consulta = (params) => {
  if (!params) return '';
  const pares = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return pares.length ? `?${new URLSearchParams(pares.map(([k, v]) => [k, String(v)]))}` : '';
};

// `publica`: no envía token ni trata el 401 como sesión vencida (login, código, recuperar clave).
// `sinRed`: no envía `X-Red-Id` (perfil, Mi cuenta, Plataforma).
export async function api(ruta, { metodo = 'GET', cuerpo, params, publica = false, sinRed = false, senal = senalActual } = {}) {
  const cabeceras = { Accept: 'application/json' };
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (!publica && token) cabeceras.Authorization = `Bearer ${token}`;
  if (!publica && !sinRed && idRed) cabeceras['X-Red-Id'] = String(idRed);

  let respuesta;
  try {
    respuesta = await fetch(`${URL_API}${ruta}${consulta(params)}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: senal ?? undefined,
    });
  } catch {
    if (senal?.aborted) throw new ErrorApi({ codigo: 'CANCELADA', mensaje: 'Consulta cancelada' });
    throw new ErrorApi({ mensaje: 'No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.' });
  }

  if (respuesta.status === 204) return null;
  const datos = await respuesta.json().catch(() => null);
  if (respuesta.ok) return datos;

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

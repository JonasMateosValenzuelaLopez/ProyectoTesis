import { api } from './cliente';
import type { Mensaje, Perfil, Sesion } from './tipos';

// Endpoints de `auth` (auth.controller.ts y mis-datos.controller.ts)

export const login = (identificador: string, password: string) =>
  api<Sesion>('/auth/login', { metodo: 'POST', cuerpo: { identificador, password }, publica: true });

// Siempre responde { mensaje }, exista o no la cuenta
export const pedirCodigo = (identificador: string) =>
  api<Mensaje>('/auth/codigo', { metodo: 'POST', cuerpo: { identificador }, publica: true });

export const verificarCodigo = (identificador: string, codigo: string) =>
  api<Sesion>('/auth/codigo/verificar', { metodo: 'POST', cuerpo: { identificador, codigo }, publica: true });

export const perfil = () => api<Perfil>('/auth/perfil', { sinRed: true });

export const marcarTutorialVisto = () =>
  api<null>('/auth/tutorial-visto', { metodo: 'POST', cuerpo: { lado: 'app' }, sinRed: true });

// Mis datos: teléfono (o null para quitarlo) y confirmar correo devuelven el perfil actualizado
export const actualizarTelefono = (telefono: string | null) =>
  api<Perfil>('/auth/perfil/telefono', { metodo: 'PUT', cuerpo: { telefono }, sinRed: true });

export const pedirCambioCorreo = (correo: string) =>
  api<Mensaje & { expiraEn: string }>('/auth/perfil/correo', { metodo: 'POST', cuerpo: { correo }, sinRed: true });

export const confirmarCambioCorreo = (codigo: string) =>
  api<Perfil>('/auth/perfil/correo/confirmacion', { metodo: 'POST', cuerpo: { codigo }, sinRed: true });

// Devuelve una sesión nueva: el token anterior deja de servir
export const cambiarPassword = (passwordActual: string, passwordNueva: string) =>
  api<Sesion>('/auth/perfil/password', { metodo: 'PUT', cuerpo: { passwordActual, passwordNueva }, sinRed: true });

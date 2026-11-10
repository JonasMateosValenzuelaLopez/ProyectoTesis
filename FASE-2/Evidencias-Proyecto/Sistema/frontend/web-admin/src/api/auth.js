import { api } from './cliente';

// Endpoints de `auth` (auth.controller.ts y mis-datos.controller.ts). Responden con los nombres del backend.

// { accessToken, tokenType, usuario: perfil }
export const login = (identificador, password) =>
  api('/auth/login', { metodo: 'POST', cuerpo: { identificador, password }, publica: true });

// Siempre responde { mensaje }, exista o no la cuenta
export const pedirCodigo = (identificador) =>
  api('/auth/codigo', { metodo: 'POST', cuerpo: { identificador }, publica: true });

// { accessToken, tokenType, usuario: perfil }
export const verificarCodigo = (identificador, codigo) =>
  api('/auth/codigo/verificar', { metodo: 'POST', cuerpo: { identificador, codigo }, publica: true });

// Acepta { correo } o { identificador }. Siempre responde { mensaje }, exista o no la cuenta
export const recuperarPassword = (datos) =>
  api('/auth/recuperar-password', { metodo: 'POST', cuerpo: datos, publica: true });

// El mismo enlace sirve para recuperar la clave y para activar una cuenta invitada
export const restablecerPassword = (token, password) =>
  api('/auth/restablecer-password', { metodo: 'POST', cuerpo: { token, password }, publica: true });

// { idUsuario, identificador, pais, nombre, primerApellido, segundoApellido, correo, telefono,
//   esPlataforma, tutorialAppVisto, tutorialPanelVisto, comunidades: [...] }
export const perfil = () => api('/auth/perfil', { sinRed: true });

export const marcarTutorialVisto = () =>
  api('/auth/tutorial-visto', { metodo: 'POST', cuerpo: { lado: 'panel' }, sinRed: true });

// Mi cuenta: teléfono (o null para quitarlo) y confirmar correo devuelven el perfil actualizado
export const actualizarTelefono = (telefono) =>
  api('/auth/perfil/telefono', { metodo: 'PUT', cuerpo: { telefono }, sinRed: true });

// { mensaje, expiraEn }
// Pide la contraseña actual (`passwordActual`); si no calza, el error viene en `campos.passwordActual`
export const pedirCambioCorreo = (correo, passwordActual) =>
  api('/auth/perfil/correo', { metodo: 'POST', cuerpo: { correo, passwordActual }, sinRed: true });

export const confirmarCambioCorreo = (codigo) =>
  api('/auth/perfil/correo/confirmacion', { metodo: 'POST', cuerpo: { codigo }, sinRed: true });

// Devuelve una sesión nueva ({ accessToken, usuario }): el token anterior deja de servir
export const cambiarPassword = (passwordActual, passwordNueva) =>
  api('/auth/perfil/password', { metodo: 'PUT', cuerpo: { passwordActual, passwordNueva }, sinRed: true });

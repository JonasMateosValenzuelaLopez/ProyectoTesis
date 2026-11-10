import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { sesionApi } from '../api/cliente';
import * as auth from '../api/auth';
import { comunidadesPanel } from '../config/roles';

// Sesión del panel: el perfil que devuelve la API (`auth/perfil`) y la comunidad y el cargo (`idRol`)
// con que se está trabajando. La comunidad elegida va en `X-Red-Id` en cada llamada.
// El token vive en sessionStorage: se borra al cerrar la pestaña.
const SesionContext = createContext(null);
const CLAVE_CONTEXTO = 'entrecasas.contexto';

const leerContexto = () => {
  try { return JSON.parse(sessionStorage.getItem(CLAVE_CONTEXTO)) ?? null; } catch { return null; }
};
const guardarContexto = (valor) => {
  try {
    if (valor) sessionStorage.setItem(CLAVE_CONTEXTO, JSON.stringify(valor));
    else sessionStorage.removeItem(CLAVE_CONTEXTO);
  } catch { /* sin almacenamiento */ }
};

// Con cargos en una sola comunidad se entra directo con el primero; con varias, la persona elige
const contextoAlEntrar = (usuario) => {
  const grupos = comunidadesPanel(usuario);
  return grupos.length === 1 ? { idRed: grupos[0].comunidad.idRed, idRol: grupos[0].roles[0] } : null;
};
// El contexto guardado sigue valiendo si la persona todavía tiene ese cargo en esa comunidad
const contextoValido = (usuario, ctx) => !!ctx && comunidadesPanel(usuario)
  .some((g) => g.comunidad.idRed === ctx.idRed && g.roles.includes(ctx.idRol));

export function SesionProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [activo, setActivo] = useState(null);
  // Mientras se recupera la sesión de una pestaña recargada
  const [cargando, setCargando] = useState(() => !!sesionApi.token());
  // Por qué se cerró la sesión (token vencido, contraseña cambiada): lo muestra la pantalla de entrada
  const [motivoSalida, setMotivoSalida] = useState(null);

  const elegir = useCallback((ctx) => {
    setActivo(ctx);
    guardarContexto(ctx);
    sesionApi.usarRed(ctx?.idRed ?? null);
  }, []);

  const cerrarSesion = useCallback((motivo = null) => {
    sesionApi.guardarToken(null);
    elegir(null);
    setUsuario(null);
    setMotivoSalida(motivo);
  }, [elegir]);

  // Recupera la sesión al recargar la pestaña. Solo se cierra si el backend rechaza el token (401 o 403);
  // si falla la red o el servidor, el token se conserva y el panel ofrece reintentar (`sinConexion`).
  const [sinConexion, setSinConexion] = useState(null);
  const recuperar = useCallback(() => auth.perfil()
    .then((p) => {
      setSinConexion(null);
      setUsuario(p);
      const guardado = leerContexto();
      elegir(contextoValido(p, guardado) ? guardado : contextoAlEntrar(p));
    })
    .catch((error) => {
      if (error?.statusCode === 401 || error?.statusCode === 403) cerrarSesion(error.message);
      else setSinConexion(error?.message ?? 'No pudimos conectar con el servidor.');
    })
    .finally(() => setCargando(false)), [elegir, cerrarSesion]);
  useEffect(() => {
    if (sesionApi.token()) recuperar();
  }, [recuperar]);
  const reintentar = useCallback(() => { setCargando(true); setSinConexion(null); recuperar(); }, [recuperar]);

  // Token vencido o inválido en cualquier llamada: se cierra la sesión con el mensaje del backend
  useEffect(() => {
    sesionApi.alExpirar((error) => cerrarSesion(error.message));
  }, [cerrarSesion]);

  const valor = useMemo(() => {
    const porComunidad = comunidadesPanel(usuario);
    const comunidad = activo ? usuario?.comunidades.find((c) => c.idRed === activo.idRed) ?? null : null;

    return {
      usuario, cargando, motivoSalida, sinConexion, reintentar,
      comunidad,
      cargo: activo?.idRol ?? null,
      porComunidad,
      esPlataforma: !!usuario?.esPlataforma,
      // Respuesta de login o verificación de código: { accessToken, usuario }
      iniciarSesion: ({ accessToken, usuario: perfil }) => {
        sesionApi.guardarToken(accessToken);
        setMotivoSalida(null);
        setUsuario(perfil);
        elegir(contextoAlEntrar(perfil));
      },
      cerrarSesion,
      cambiarContexto: (idRed, idRol) => elegir({ idRed, idRol }),
      // Después de cambiar teléfono o correo, la API devuelve el perfil actualizado
      actualizarPerfil: (perfil) => setUsuario(perfil),
      // Cambiar la contraseña entrega un token nuevo: el anterior deja de servir
      renovarSesion: ({ accessToken, usuario: perfil }) => {
        sesionApi.guardarToken(accessToken);
        setUsuario(perfil);
      },
      recargarPerfil: async () => {
        const p = await auth.perfil();
        setUsuario(p);
        return p;
      },
      // El tutorial del panel se muestra una vez por persona (`usuarios.tutorial_panel_visto`)
      tutorialPendiente: !!usuario && !usuario.tutorialPanelVisto,
      marcarTutorialVisto: () => {
        if (!usuario || usuario.tutorialPanelVisto) return;
        setUsuario({ ...usuario, tutorialPanelVisto: true });
        auth.marcarTutorialVisto().catch(() => { /* se volverá a mostrar la próxima vez */ });
      },
    };
  }, [usuario, activo, cargando, motivoSalida, sinConexion, reintentar, elegir, cerrarSesion]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSesion = () => useContext(SesionContext);

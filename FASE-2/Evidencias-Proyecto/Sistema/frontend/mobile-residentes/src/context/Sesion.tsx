import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as auth from '@/api/auth';
import { sesionApi } from '@/api/cliente';
import { RolUsuario, type CodigoModulo, type ComunidadPerfil, type Perfil, type Sesion, type UnidadPerfil } from '@/api/tipos';

// Sesión de la app: el perfil que devuelve la API (`auth/perfil`) y la vivienda con que actúa la persona.
// La comunidad de esa vivienda va en `X-Red-Id` en cada llamada. El token se guarda cifrado en el teléfono.

// Una vivienda de la persona, con su comunidad
export type Vivienda = { comunidad: ComunidadPerfil; unidad: UnidadPerfil };

// Viviendas de todas las comunidades del perfil (una persona puede vivir o tener más de una)
export const viviendasDe = (perfil: Perfil | null): Vivienda[] => (perfil?.comunidades ?? [])
  .flatMap((comunidad) => comunidad.unidades.map((unidad) => ({ comunidad, unidad })));

// La app es para quienes viven en la comunidad: sin vivienda, la cuenta es del panel
export const tieneVivienda = (perfil: Perfil) => viviendasDe(perfil).length > 0;

function useValor() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [idUnidad, setIdUnidad] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  // Por qué se cerró la sesión (token vencido, contraseña cambiada): lo muestra la pantalla de entrada
  const [motivoSalida, setMotivoSalida] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setAviso(null), 3500);
  }, []);

  // Elige la vivienda (y su comunidad para `X-Red-Id`); si la pedida ya no está, la primera
  const elegirVivienda = useCallback((p: Perfil | null, pedida: number | null) => {
    const viviendas = viviendasDe(p);
    const v = viviendas.find((x) => x.unidad.idUnidad === pedida) ?? viviendas[0] ?? null;
    setIdUnidad(v?.unidad.idUnidad ?? null);
    sesionApi.usarRed(v?.comunidad.idRed ?? null);
  }, []);

  const cerrarSesion = useCallback((motivo: string | null = null) => {
    sesionApi.guardarToken(null);
    sesionApi.usarRed(null);
    setPerfil(null);
    setIdUnidad(null);
    setMotivoSalida(motivo);
  }, []);

  // Al abrir la app, recupera la sesión guardada
  useEffect(() => {
    sesionApi.cargar()
      .then(async (token) => {
        if (!token) return;
        const p = await auth.perfil();
        if (!tieneVivienda(p)) { cerrarSesion(); return; }
        setPerfil(p);
        elegirVivienda(p, null);
      })
      .catch(() => cerrarSesion())
      .finally(() => setCargando(false));
  }, [cerrarSesion, elegirVivienda]);

  // Token vencido o inválido en cualquier llamada: se cierra la sesión con el mensaje del backend
  useEffect(() => {
    sesionApi.alExpirar((error) => cerrarSesion(error.message));
  }, [cerrarSesion]);

  return useMemo(() => {
    const viviendas = viviendasDe(perfil);
    const actual = viviendas.find((v) => v.unidad.idUnidad === idUnidad) ?? null;
    const comunidad = actual?.comunidad ?? null;
    // Cargo en la comunidad de la vivienda (lo ejerce en el panel web; en la app es un vecino más)
    const cargo = comunidad?.roles.map((r) => r.idRol).find((idRol) => idRol !== RolUsuario.RESIDENTE) ?? null;

    return {
      perfil, cargando, motivoSalida, aviso,
      viviendas,
      comunidad,
      unidad: actual?.unidad ?? null,
      cargo,
      tiene: (m: CodigoModulo) => !!comunidad?.modulos.includes(m),
      // El tutorial de la app se muestra una vez por persona (`usuarios.tutorial_app_visto`)
      tutorialPendiente: !!perfil && !perfil.tutorialAppVisto,
      acciones: {
        // Respuesta de login o verificación de código
        iniciarSesion: async (s: Sesion) => {
          await sesionApi.guardarToken(s.accessToken);
          setMotivoSalida(null);
          setPerfil(s.usuario);
          elegirVivienda(s.usuario, null);
        },
        cerrarSesion,
        cambiarVivienda: (id: number) => {
          elegirVivienda(perfil, id);
          const v = viviendas.find((x) => x.unidad.idUnidad === id);
          if (v) avisar(`Ahora ves ${v.unidad.tipoUnidad === 'Departamento' ? 'el Depto' : 'la Casa'} ${v.unidad.numeroIdentificador}.`);
        },
        // Después de cambiar teléfono o correo, la API devuelve el perfil actualizado
        actualizarPerfil: (p: Perfil) => { setPerfil(p); elegirVivienda(p, idUnidad); },
        // Cambiar la contraseña entrega un token nuevo: el anterior deja de servir
        renovarSesion: async (s: Sesion) => {
          await sesionApi.guardarToken(s.accessToken);
          setPerfil(s.usuario);
          elegirVivienda(s.usuario, idUnidad);
        },
        marcarTutorialVisto: () => {
          if (!perfil || perfil.tutorialAppVisto) return;
          setPerfil({ ...perfil, tutorialAppVisto: true });
          auth.marcarTutorialVisto().catch(() => { /* se volverá a mostrar la próxima vez */ });
        },
        avisar,
      },
    };
  }, [perfil, idUnidad, cargando, motivoSalida, aviso, cerrarSesion, elegirVivienda, avisar]);
}

type Valor = ReturnType<typeof useValor>;
const SesionContext = createContext<Valor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const valor = useValor();
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const v = useContext(SesionContext);
  if (!v) throw new Error('useSesion va dentro de SesionProvider');
  return v;
}

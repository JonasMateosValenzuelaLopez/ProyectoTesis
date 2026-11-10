import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Apariencia elegida por el residente: claro, oscuro o lo que use el teléfono (vive en memoria),
// y el tamaño de letra de la app, que se recuerda en el teléfono (también antes de iniciar sesión).
export type Apariencia = 'claro' | 'oscuro' | 'sistema';

// Tamaño de letra: de 85 % a 160 %, en pasos de 5 %. Se multiplica con el tamaño que la persona eligió en
// los ajustes del teléfono, con un tope total de 2× (ver Texto y Campo) para que no se descuadren las pantallas.
export const ESCALA_MIN = 0.85;
export const ESCALA_MAX = 1.6;
export const ESCALA_PASO = 0.05;
export const ESCALA_TOPE_TOTAL = 2;
const CLAVE_ESCALA = 'entrecasas.escalaTexto';
const redondear = (n: number) => Math.round(n * 100) / 100;
export const ajustarEscala = (n: number) => redondear(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, n)));

// En el teléfono se guarda con SecureStore (ya está en la app); en Expo web, en el navegador
const almacen = {
  leer: async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try { return globalThis.localStorage?.getItem(CLAVE_ESCALA) ?? null; } catch { return null; }
    }
    return SecureStore.getItemAsync(CLAVE_ESCALA);
  },
  guardar: async (valor: string) => {
    if (Platform.OS === 'web') {
      try { globalThis.localStorage?.setItem(CLAVE_ESCALA, valor); } catch { /* sin almacenamiento: dura mientras la app esté abierta */ }
      return;
    }
    await SecureStore.setItemAsync(CLAVE_ESCALA, valor);
  },
};

type Valor = {
  apariencia: Apariencia; setApariencia: (a: Apariencia) => void;
  escalaTexto: number; setEscalaTexto: (n: number) => void;
};
const TemaContext = createContext<Valor>({
  apariencia: 'sistema', setApariencia: () => {}, escalaTexto: 1, setEscalaTexto: () => {},
});

export function TemaProvider({ children }: { children: ReactNode }) {
  const [apariencia, setApariencia] = useState<Apariencia>('sistema');
  const [escalaTexto, setEscala] = useState(1);
  useEffect(() => {
    almacen.leer()
      .then((v) => { const n = Number(v); if (v && Number.isFinite(n)) setEscala(ajustarEscala(n)); })
      .catch(() => { /* queda en 100 % */ });
  }, []);
  const setEscalaTexto = useCallback((n: number) => {
    const ajustada = ajustarEscala(n);
    setEscala(ajustada);
    almacen.guardar(String(ajustada)).catch(() => { /* dura mientras la app esté abierta */ });
  }, []);
  const valor = useMemo(() => ({ apariencia, setApariencia, escalaTexto, setEscalaTexto }), [apariencia, escalaTexto, setEscalaTexto]);
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export const useApariencia = () => useContext(TemaContext);

// Escala de letra vigente. `EscalaFija` la deja en 100 % para lo que debe conservar su tamaño
// (las pantallas en miniatura del tutorial, que son ilustraciones de tamaño fijo).
const EscalaFijaContext = createContext(false);
export function EscalaFija({ children }: { children: ReactNode }) {
  return <EscalaFijaContext.Provider value>{children}</EscalaFijaContext.Provider>;
}
export function useEscalaTexto() {
  const { escalaTexto } = useContext(TemaContext);
  return useContext(EscalaFijaContext) ? 1 : escalaTexto;
}

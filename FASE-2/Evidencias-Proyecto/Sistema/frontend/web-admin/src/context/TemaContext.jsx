import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { crearTema } from '../theme';
import { ajustarEscala } from '../utils/escalaLetra';

// Preferencias de cada persona, guardadas solo en este navegador:
// apariencia (claro, oscuro o lo que use su dispositivo) y tamaño de letra del panel.
const CLAVE = 'entrecasas.tema';
const CLAVE_LETRA = 'entrecasas.escalaLetra';
const TemaContext = createContext(null);

const leer = () => {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' ? v : 'sistema';
  } catch {
    return 'sistema';
  }
};

const leerEscala = () => {
  try {
    const n = Number(localStorage.getItem(CLAVE_LETRA));
    return n ? ajustarEscala(n) : 1;
  } catch {
    return 1;
  }
};

export function TemaProvider({ children }) {
  const [preferencia, setPreferencia] = useState(leer);
  const [escala, setEscalaCruda] = useState(leerEscala);
  const sistemaOscuro = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const modo = preferencia === 'sistema' ? (sistemaOscuro ? 'dark' : 'light') : preferencia === 'oscuro' ? 'dark' : 'light';
  const tema = useMemo(() => crearTema(modo), [modo]);

  useEffect(() => {
    try {
      if (preferencia === 'sistema') localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, preferencia);
    } catch { /* sin almacenamiento: la elección dura mientras la pestaña esté abierta */ }
  }, [preferencia]);

  useEffect(() => {
    document.documentElement.style.fontSize = escala === 1 ? '' : `${escala * 100}%`;
    try {
      if (escala === 1) localStorage.removeItem(CLAVE_LETRA);
      else localStorage.setItem(CLAVE_LETRA, String(escala));
    } catch { /* sin almacenamiento: dura mientras la pestaña esté abierta */ }
  }, [escala]);

  const valor = useMemo(() => ({
    preferencia, setPreferencia, modo, escala, setEscala: (n) => setEscalaCruda(ajustarEscala(n)),
  }), [preferencia, modo, escala]);
  return (
    <TemaContext.Provider value={valor}>
      <ThemeProvider theme={tema}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </TemaContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTemaPreferido = () => useContext(TemaContext);

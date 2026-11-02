import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { crearTema } from '../theme';

// Preferencia de apariencia de cada persona: claro, oscuro o lo que use su dispositivo.
// Se guarda solo en este navegador.
const CLAVE = 'entrecasas.tema';
const TemaContext = createContext(null);

const leer = () => {
  try {
    const v = localStorage.getItem(CLAVE);
    return v === 'claro' || v === 'oscuro' ? v : 'sistema';
  } catch {
    return 'sistema';
  }
};

export function TemaProvider({ children }) {
  const [preferencia, setPreferencia] = useState(leer);
  const sistemaOscuro = useMediaQuery('(prefers-color-scheme: dark)', { noSsr: true });
  const modo = preferencia === 'sistema' ? (sistemaOscuro ? 'dark' : 'light') : preferencia === 'oscuro' ? 'dark' : 'light';
  const tema = useMemo(() => crearTema(modo), [modo]);

  useEffect(() => {
    try {
      if (preferencia === 'sistema') localStorage.removeItem(CLAVE);
      else localStorage.setItem(CLAVE, preferencia);
    } catch { /* sin almacenamiento: la elección dura mientras la pestaña esté abierta */ }
  }, [preferencia]);

  const valor = useMemo(() => ({ preferencia, setPreferencia, modo }), [preferencia, modo]);
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

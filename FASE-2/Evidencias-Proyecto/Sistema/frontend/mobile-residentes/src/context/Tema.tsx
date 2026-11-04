import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Apariencia elegida por el residente: claro, oscuro o lo que use el teléfono.
// Vive en memoria como el resto del estado de la app.
export type Apariencia = 'claro' | 'oscuro' | 'sistema';

const TemaContext = createContext<{ apariencia: Apariencia; setApariencia: (a: Apariencia) => void }>({
  apariencia: 'sistema',
  setApariencia: () => {},
});

export function TemaProvider({ children }: { children: ReactNode }) {
  const [apariencia, setApariencia] = useState<Apariencia>('sistema');
  const valor = useMemo(() => ({ apariencia, setApariencia }), [apariencia]);
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export const useApariencia = () => useContext(TemaContext);

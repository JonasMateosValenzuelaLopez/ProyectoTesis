import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos de la API al montar la pantalla y cada vez que cambian `deps` (o se llama a `recargar`).
// Igual que en el panel: { datos, cargando, error, recargar, setDatos }. Los datos anteriores se mantienen
// mientras llega la consulta nueva.
export function useConsulta<T>(pedir: () => Promise<T>, deps: unknown[] = []) {
  const [vuelta, setVuelta] = useState(0);
  const clave = JSON.stringify([...deps, vuelta]);
  const [estado, setEstado] = useState<{ clave: string | null; datos: T | null; error: Error | null }>({ clave: null, datos: null, error: null });

  // La función más reciente, sin que cambiarla dispare otra consulta
  const pedirActual = useRef(pedir);
  useEffect(() => { pedirActual.current = pedir; });

  useEffect(() => {
    let vigente = true;
    pedirActual.current()
      .then((datos) => { if (vigente) setEstado({ clave, datos, error: null }); })
      .catch((error: Error) => { if (vigente) setEstado((s) => ({ clave, datos: s.datos, error })); });
    return () => { vigente = false; };
  }, [clave]);

  const recargar = useCallback(() => setVuelta((n) => n + 1), []);
  const setDatos = useCallback((valor: T | ((d: T | null) => T)) => setEstado((s) => ({
    ...s, datos: typeof valor === 'function' ? (valor as (d: T | null) => T)(s.datos) : valor,
  })), []);
  const actual = estado.clave === clave;
  return { datos: estado.datos, cargando: !actual, error: actual ? estado.error : null, recargar, setDatos };
}

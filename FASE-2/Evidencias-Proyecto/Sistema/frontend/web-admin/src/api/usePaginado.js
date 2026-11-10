import { useCallback, useState } from 'react';
import { useConsulta } from './useConsulta';

// Listas paginadas de la API ({ [campo]: [...], siguiente }): la primera página con useConsulta y las demás
// con `cargarMas`, que pide `pedir(siguiente)` y las agrega al final. `reemplazar(item)` pone la versión que
// devolvió una acción sin volver a pedir todo; `recargar` vuelve a la primera página.
export function usePaginado(pedir, deps, campo, idDe) {
  const [vuelta, setVuelta] = useState(0);
  const claveDeps = [...deps, vuelta];
  const clave = JSON.stringify(claveDeps);
  const primera = useConsulta(() => pedir(undefined), claveDeps);
  const [mas, setMas] = useState({ clave: null, items: [], siguiente: undefined });
  const [cargandoMas, setCargandoMas] = useState(false);
  // Error de «Ver más» (la primera página tiene el suyo en `error`); se limpia al reintentar
  const [errorMas, setErrorMas] = useState(null);
  const extra = mas.clave === clave ? mas : null;

  const items = primera.datos ? [...primera.datos[campo], ...(extra?.items ?? [])] : null;
  const siguiente = extra ? extra.siguiente : primera.datos?.siguiente ?? null;

  const cargarMas = async () => {
    if (!siguiente || cargandoMas) return;
    setCargandoMas(true);
    setErrorMas(null);
    try {
      const r = await pedir(siguiente);
      setMas((m) => ({ clave, items: [...(m.clave === clave ? m.items : []), ...r[campo]], siguiente: r.siguiente }));
    } catch (err) {
      setErrorMas(err);
    } finally {
      setCargandoMas(false);
    }
  };
  const { setDatos } = primera;
  const reemplazar = useCallback((nuevo) => {
    const cambiar = (lista) => lista.map((x) => (idDe(x) === idDe(nuevo) ? nuevo : x));
    setDatos((d) => (d ? { ...d, [campo]: cambiar(d[campo]) } : d));
    setMas((m) => ({ ...m, items: cambiar(m.items) }));
  }, [setDatos, campo, idDe]);
  const recargar = useCallback(() => setVuelta((n) => n + 1), []);

  return { items, cargando: primera.cargando, error: primera.error, siguiente, cargarMas, cargandoMas, errorMas, reemplazar, recargar };
}

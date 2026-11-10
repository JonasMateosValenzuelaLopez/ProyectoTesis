import { useCallback, useState } from 'react';
import { useConsulta } from './useConsulta';

type Pagina<K extends string, T> = { [k in K]: T[] } & { siguiente: number | null };

// Listas paginadas de la API ({ [campo]: [...], siguiente }), igual que en el panel: la primera página con
// useConsulta y las demás con `cargarMas`. `reemplazar` y `quitar` actualizan un elemento sin volver a pedir todo.
export function usePaginado<K extends string, T>(
  pedir: (antesDe?: number | null) => Promise<Pagina<K, T>>,
  deps: unknown[],
  campo: K,
  idDe: (x: T) => number,
) {
  const [vuelta, setVuelta] = useState(0);
  const claveDeps = [...deps, vuelta];
  const clave = JSON.stringify(claveDeps);
  const primera = useConsulta(() => pedir(null), claveDeps);
  const [mas, setMas] = useState<{ clave: string | null; items: T[]; siguiente: number | null }>({ clave: null, items: [], siguiente: null });
  const [cargandoMas, setCargandoMas] = useState(false);
  const extra = mas.clave === clave ? mas : null;

  const items = primera.datos ? [...primera.datos[campo], ...(extra?.items ?? [])] : null;
  const siguiente = extra ? extra.siguiente : primera.datos?.siguiente ?? null;

  const cargarMas = async () => {
    if (!siguiente || cargandoMas) return;
    setCargandoMas(true);
    try {
      const r = await pedir(siguiente);
      setMas((m) => ({ clave, items: [...(m.clave === clave ? m.items : []), ...r[campo]], siguiente: r.siguiente }));
    } catch {
      // Se puede volver a intentar con el mismo botón
    } finally {
      setCargandoMas(false);
    }
  };
  const { setDatos } = primera;
  const cambiar = useCallback((f: (lista: T[]) => T[]) => {
    setDatos((d) => (d ? ({ ...d, [campo]: f(d[campo]) } as Pagina<K, T>) : (d as unknown as Pagina<K, T>)));
    setMas((m) => ({ ...m, items: f(m.items) }));
  }, [setDatos, campo]);
  const reemplazar = useCallback((nuevo: T) => cambiar((l) => l.map((x) => (idDe(x) === idDe(nuevo) ? nuevo : x))), [cambiar, idDe]);
  const quitar = useCallback((id: number) => cambiar((l) => l.filter((x) => idDe(x) !== id)), [cambiar, idDe]);
  const agregarAlInicio = useCallback((nuevo: T) => cambiar((l) => [nuevo, ...l.filter((x) => idDe(x) !== idDe(nuevo))]), [cambiar, idDe]);
  const recargar = useCallback(() => setVuelta((n) => n + 1), []);

  return { items, cargando: primera.cargando, error: primera.error, siguiente, cargarMas, cargandoMas, reemplazar, quitar, agregarAlInicio, recargar };
}

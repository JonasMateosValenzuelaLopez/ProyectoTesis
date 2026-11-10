import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos de la API al montar la vista y cada vez que cambian `deps` (o se llama a `recargar`).
// Devuelve { datos, cargando, error, recargar, setDatos }:
// - `cargando` es true mientras la respuesta de la consulta actual no llega (los datos anteriores se mantienen);
// - `setDatos` pone la respuesta de una acción (por ejemplo, el resumen actualizado) sin volver a pedir todo.
export function useConsulta(pedir, deps = []) {
  const [vuelta, setVuelta] = useState(0);
  const clave = JSON.stringify([...deps, vuelta]);
  const [estado, setEstado] = useState({ clave: null, datos: null, error: null });

  // La función más reciente, sin que cambiarla dispare otra consulta
  const pedirActual = useRef(pedir);
  useEffect(() => { pedirActual.current = pedir; });

  useEffect(() => {
    let vigente = true;
    pedirActual.current()
      .then((datos) => { if (vigente) setEstado({ clave, datos, error: null }); })
      .catch((error) => { if (vigente) setEstado((s) => ({ clave, datos: s.datos, error })); });
    return () => { vigente = false; };
  }, [clave]);

  const recargar = useCallback(() => setVuelta((n) => n + 1), []);
  const setDatos = useCallback((valor) => setEstado((s) => ({ ...s, datos: typeof valor === 'function' ? valor(s.datos) : valor })), []);
  const actual = estado.clave === clave;
  return { datos: estado.datos, cargando: !actual, error: actual ? estado.error : null, recargar, setDatos };
}

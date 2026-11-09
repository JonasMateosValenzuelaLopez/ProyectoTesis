import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

// Llama a `recargar` cada vez que la pantalla vuelve a quedar visible (por ejemplo, al cerrar una hoja
// que cambió datos), sin repetir la consulta del primer montaje.
export function useAlEnfocar(recargar: () => void) {
  const primera = useRef(true);
  useFocusEffect(useCallback(() => {
    if (primera.current) { primera.current = false; return; }
    recargar();
  }, [recargar]));
}

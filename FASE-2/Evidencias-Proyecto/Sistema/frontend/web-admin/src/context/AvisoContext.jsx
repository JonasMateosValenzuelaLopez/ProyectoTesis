import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

// Aviso breve después de una acción (abajo al centro). `avisar(texto)` confirma; `avisarError(texto)` muestra
// el mensaje del backend cuando algo no se pudo hacer.
const AvisoContext = createContext(null);

export function AvisoProvider({ children }) {
  const [aviso, setAviso] = useState(null);
  const cerrar = useCallback(() => setAviso(null), []);
  const valor = useMemo(() => ({
    avisar: (texto) => setAviso({ texto, tono: 'success' }),
    avisarError: (texto) => setAviso({ texto, tono: 'error' }),
  }), []);
  return (
    <AvisoContext.Provider value={valor}>
      {children}
      <Snackbar open={!!aviso} autoHideDuration={aviso?.tono === 'error' ? 6000 : 4000} onClose={cerrar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {aviso ? <Alert onClose={cerrar} severity={aviso.tono} variant="filled" sx={{ width: '100%' }}>{aviso.texto}</Alert> : <span />}
      </Snackbar>
    </AvisoContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAviso = () => useContext(AvisoContext);

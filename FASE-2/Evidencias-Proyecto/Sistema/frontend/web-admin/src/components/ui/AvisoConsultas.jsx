import { Alert, Button } from '@mui/material';

// Aviso con las consultas que no se pudieron cargar (ver utils/consultas.js) y un botón para volver a pedirlas
export default function AvisoConsultas({ fallidas, sx }) {
  if (!fallidas.length) return null;
  const nombres = fallidas.map((c) => c.nombre);
  const lista = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : nombres[0];
  return (
    <Alert
      severity="error" sx={sx}
      action={<Button color="inherit" size="small" onClick={() => fallidas.forEach((c) => c.consulta.recargar())}>Reintentar</Button>}
    >
      No pudimos cargar {lista}: {fallidas[0].consulta.error.message} Lo que ves puede estar incompleto.
    </Alert>
  );
}

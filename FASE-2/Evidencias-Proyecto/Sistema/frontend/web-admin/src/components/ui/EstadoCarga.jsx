import { Alert, Box, Button, CircularProgress } from '@mui/material';

// Mientras llegan los datos de la API, o si no se pudieron traer (con el mensaje del backend y «Reintentar»).
// Devuelve null cuando ya hay datos: la vista sigue normal.
export default function EstadoCarga({ cargando, error, onReintentar }) {
  if (error) {
    return (
      <Alert severity="error" action={onReintentar && <Button color="inherit" size="small" onClick={onReintentar}>Reintentar</Button>}>
        {error.message}
      </Alert>
    );
  }
  if (cargando) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
        <CircularProgress aria-label="Cargando" />
      </Box>
    );
  }
  return null;
}

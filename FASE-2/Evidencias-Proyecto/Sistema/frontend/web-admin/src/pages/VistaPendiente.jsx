import { useLocation } from 'react-router-dom';
import { Box, Paper, Typography } from '@mui/material';
import { TODAS_LAS_RUTAS } from '../config/navegacion';
import { useSesion } from '../context/SesionContext';
import { roles } from '../tokens';

// Vista provisoria para las secciones del menú que se construyen en la fase 3.
export default function VistaPendiente() {
  const { pathname } = useLocation();
  const { comunidad, cargo } = useSesion();
  const item = TODAS_LAS_RUTAS.find((i) => i.ruta === pathname);
  return (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 720 }}>
      <Typography variant="h4" component="h1">{item?.texto ?? 'Sección'}</Typography>
      <Paper variant="outlined" sx={{ p: 3, display: 'grid', gap: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>Esta vista se construye en la fase 3.</Typography>
        <Typography color="text.secondary">
          La ves porque eres {roles[cargo].label} en {comunidad.nombre} y la comunidad tiene activo el módulo que necesita.
        </Typography>
      </Paper>
    </Box>
  );
}

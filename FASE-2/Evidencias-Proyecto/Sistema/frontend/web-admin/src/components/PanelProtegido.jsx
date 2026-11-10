import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSesion } from '../context/SesionContext';
import DashboardLayout from './DashboardLayout';

// Mientras se recupera una sesión (pestaña recargada)
export function Cargando() {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <CircularProgress aria-label="Cargando" />
    </Box>
  );
}

// Sin sesión no hay panel. Cada área carga sus datos de la API dentro del panel.
// Al volver a entrar, se regresa a la página donde estaba (`state.desde`).
export default function PanelProtegido() {
  const location = useLocation();
  const { usuario, comunidad, porComunidad, esPlataforma, cargando } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (esPlataforma && !comunidad) return <Navigate to="/plataforma" replace />;
  // Con cargos en varias comunidades, primero elige con cuál trabajar
  if (!comunidad && porComunidad.length > 1) return <Navigate to="/elegir-comunidad" replace />;
  if (!comunidad) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

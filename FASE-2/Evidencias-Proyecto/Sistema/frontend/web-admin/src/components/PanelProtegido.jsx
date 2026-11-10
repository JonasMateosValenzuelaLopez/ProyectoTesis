import { Navigate, useLocation } from 'react-router-dom';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { CloudOffOutlined as SinRedIcon, Refresh as ReintentarIcon } from '@mui/icons-material';
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

// Al recargar la pestaña no se pudo llegar al servidor: la sesión se conserva y se ofrece reintentar
export function SinConexion() {
  const { sinConexion, reintentar, cerrarSesion } = useSesion();
  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', px: 2 }}>
      <Box sx={{ maxWidth: 440, display: 'grid', gap: 2, textAlign: 'center', justifyItems: 'center' }}>
        <SinRedIcon sx={{ fontSize: 48, color: 'primary.main' }} />
        <Typography variant="h5" component="h1">Sin conexión</Typography>
        <Typography color="text.secondary">{sinConexion}</Typography>
        <Typography color="text.secondary">Tu sesión sigue guardada: cuando vuelva la conexión, entras sin escribir tu clave.</Typography>
        <Button variant="contained" startIcon={<ReintentarIcon />} onClick={reintentar}>Reintentar</Button>
        <Button onClick={() => cerrarSesion()}>Entrar con otra cuenta</Button>
      </Box>
    </Box>
  );
}

// Sin sesión no hay panel. Cada área carga sus datos de la API dentro del panel.
// Al volver a entrar, se regresa a la página donde estaba (`state.desde`).
export default function PanelProtegido() {
  const location = useLocation();
  const { usuario, comunidad, porComunidad, esPlataforma, cargando, sinConexion } = useSesion();
  if (cargando) return <Cargando />;
  if (!usuario && sinConexion) return <SinConexion />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (esPlataforma && !comunidad) return <Navigate to="/plataforma" replace />;
  // Con cargos en varias comunidades, primero elige con cuál trabajar
  if (!comunidad && porComunidad.length > 1) return <Navigate to="/elegir-comunidad" replace />;
  if (!comunidad) return <Navigate to="/login" replace />;
  return <DashboardLayout />;
}

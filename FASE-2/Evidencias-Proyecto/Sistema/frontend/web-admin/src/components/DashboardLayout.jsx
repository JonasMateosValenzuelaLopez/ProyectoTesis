import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { menuPara, puedeVer, TODAS_LAS_RUTAS } from '../config/navegacion';
import { useFinanzas } from '../context/FinanzasContext';
import { useAdmin } from '../context/AdminContext';
import { useMuro } from '../context/MuroContext';
import { useConserjeria } from '../context/ConserjeriaContext';
import MarcoPanel from './MarcoPanel';
import SelectorContexto from './SelectorContexto';
import { nombreCorto } from '../utils/formato';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, comunidad, cargo, cerrarSesion } = useSesion();

  const secciones = menuPara(cargo, comunidad);
  const { morosos, resumen } = useFinanzas();
  const { solicitudesPendientes } = useAdmin();
  const { reportadas, publicacionesPorAprobar } = useMuro();
  const { esperadas } = useConserjeria();
  const contadores = {
    porteria: esperadas.length,
    morosidad: morosos.length,
    exenciones: resumen.exencionesPendientes,
    aprobaciones: resumen.porAprobar + publicacionesPorAprobar.length,
    solicitudes: solicitudesPendientes.length,
    reportes: reportadas.length,
  };

  // Si la ruta actual no corresponde al cargo o a los módulos activos, volver al inicio.
  const rutaActual = TODAS_LAS_RUTAS.find((i) => i.ruta === location.pathname);
  if (rutaActual && !puedeVer(rutaActual, cargo, comunidad)) {
    return <Navigate to="/panel" replace />;
  }

  const handleLogout = () => {
    cerrarSesion();
    navigate('/login');
  };

  return (
    <MarcoPanel
      secciones={secciones}
      contadores={contadores}
      etiquetaMenu="Menú del panel"
      barra={(
        <>
          <SelectorContexto />
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', md: 'block' } }}>
            {nombreCorto(usuario)}
          </Typography>
          <Tooltip title="Cerrar sesión">
            <IconButton aria-label="Cerrar sesión" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
    />
  );
}

import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Logout as LogoutIcon, ManageAccountsOutlined as CuentaIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { menuPara, puedeVer, TODAS_LAS_RUTAS } from '../config/navegacion';
import MarcoPanel from './MarcoPanel';
import SelectorTema from './SelectorTema';
import PasoSesion from './marca/PasoSesion';
import BotonTutorial from './tutorial/BotonTutorial';
import SelectorContexto from './SelectorContexto';
import { nombreCorto } from '../utils/formato';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, comunidad, cargo, cerrarSesion } = useSesion();
  const [saliendo, setSaliendo] = useState(false);

  const secciones = menuPara(cargo, comunidad);
  // Contadores del menú (`pendiente`): cada módulo agrega el suyo al conectarse con la API
  const contadores = {};

  // Si la ruta actual no corresponde al cargo o a los módulos activos, volver al inicio.
  const rutaActual = TODAS_LAS_RUTAS.find((i) => i.ruta === location.pathname);
  if (rutaActual && !puedeVer(rutaActual, cargo, comunidad)) {
    return <Navigate to="/panel" replace />;
  }

  const handleLogout = () => setSaliendo(true);
  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <>
    {saliendo && <PasoSesion tipo="salir" nombre={usuario.nombre} alTerminar={salir} />}
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
          <Tooltip title="Mi cuenta">
            <IconButton aria-label="Mi cuenta" onClick={() => navigate('/panel/mi-cuenta')} sx={{ color: 'text.secondary' }}>
              <CuentaIcon />
            </IconButton>
          </Tooltip>
          <BotonTutorial cargo={cargo} />
          <SelectorTema />
          <Tooltip title="Cerrar sesión">
            <IconButton aria-label="Cerrar sesión" onClick={handleLogout} sx={{ color: 'text.secondary' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </>
      )}
    />
    </>
  );
}

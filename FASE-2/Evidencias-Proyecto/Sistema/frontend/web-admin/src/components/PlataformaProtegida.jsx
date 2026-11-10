import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Logout as LogoutIcon, ManageAccountsOutlined as CuentaIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { SECCIONES_PLATAFORMA, activoPlataforma } from '../config/plataforma';
import MarcoPanel from './MarcoPanel';
import { nombreCorto } from '../utils/formato';
import { PLATAFORMA } from '../config/roles';
import { Cargando, SinConexion } from './PanelProtegido';
import SelectorTema from './SelectorTema';
import PasoSesion from './marca/PasoSesion';
import BotonTutorial from './tutorial/BotonTutorial';

function Etiqueta() {
  return (
    <Box sx={{ display: 'inline-block', px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: 'marca.signal', color: 'marca.signalInk', fontFamily: 'Archivo, sans-serif', fontStretch: '80%', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Equipo EntreCasas
    </Box>
  );
}

// Lo que se está mirando (la ficha de una comunidad mostrará su nombre al conectarse en la fase 2)
function BarraContexto() {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>Administración de plataforma</Typography>
      <Typography noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>Todas las comunidades</Typography>
    </Box>
  );
}

// Panel del equipo EntreCasas: solo para cuentas de plataforma.
export default function PlataformaProtegida() {
  const { usuario, esPlataforma, cargando, cerrarSesion, sinConexion } = useSesion();
  const [saliendo, setSaliendo] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario && sinConexion) return <SinConexion />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (!esPlataforma) return <Navigate to="/panel" replace />;

  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {saliendo && <PasoSesion tipo="salir" nombre={usuario.nombre} alTerminar={salir} />}
      <MarcoPanel
        secciones={SECCIONES_PLATAFORMA}
        etiquetaMenu="Menú de plataforma"
        marca={<Etiqueta />}
        activo={activoPlataforma}
        barra={(
          <>
            <BarraContexto />
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', md: 'block' } }}>
              {nombreCorto(usuario)}
            </Typography>
            <Tooltip title="Mi cuenta">
              <IconButton aria-label="Mi cuenta" onClick={() => navigate('/plataforma/mi-cuenta')} sx={{ color: 'text.secondary' }}>
                <CuentaIcon />
              </IconButton>
            </Tooltip>
            <BotonTutorial cargo={PLATAFORMA} />
            <SelectorTema />
            <Tooltip title="Cerrar sesión">
              <IconButton aria-label="Cerrar sesión" onClick={() => setSaliendo(true)} sx={{ color: 'text.secondary' }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      />
    </>
  );
}

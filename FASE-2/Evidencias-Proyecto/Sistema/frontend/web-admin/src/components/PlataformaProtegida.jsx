import { Navigate, useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { PlataformaProvider } from '../context/PlataformaContext';
import { SECCIONES_PLATAFORMA, activoPlataforma } from '../config/plataforma';
import MarcoPanel from './MarcoPanel';

function Etiqueta() {
  return (
    <Box sx={{ display: 'inline-block', px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: 'marca.signal', color: 'marca.signalInk', fontFamily: 'Archivo, sans-serif', fontStretch: '80%', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Equipo EntreCasas
    </Box>
  );
}

// Panel del equipo EntreCasas: solo para cuentas de plataforma.
export default function PlataformaProtegida() {
  const { usuario, bloqueados, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!usuario.plataforma) return <Navigate to="/panel" replace />;

  const salir = () => {
    cerrarSesion();
    navigate('/login');
  };

  return (
    <PlataformaProvider>
      <MarcoPanel
        secciones={SECCIONES_PLATAFORMA}
        contadores={{ bloqueados: bloqueados.length }}
        etiquetaMenu="Menú de plataforma"
        marca={<Etiqueta />}
        activo={activoPlataforma}
        barra={(
          <>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>Administración de plataforma</Typography>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>Todas las comunidades</Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', md: 'block' } }}>
              {usuario.nombre} {usuario.apellido}
            </Typography>
            <Tooltip title="Cerrar sesión">
              <IconButton aria-label="Cerrar sesión" onClick={salir} sx={{ color: 'text.secondary' }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
      />
    </PlataformaProvider>
  );
}

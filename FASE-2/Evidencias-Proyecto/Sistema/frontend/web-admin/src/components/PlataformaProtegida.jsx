import { Navigate, useMatch, useNavigate } from 'react-router-dom';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { Logout as LogoutIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { PlataformaProvider, usePlataforma } from '../context/PlataformaContext';
import { SECCIONES_PLATAFORMA, activoPlataforma } from '../config/plataforma';
import MarcoPanel from './MarcoPanel';
import { nombreCorto } from '../utils/formato';
import { esPlataforma } from '../config/roles';

function Etiqueta() {
  return (
    <Box sx={{ display: 'inline-block', px: 0.75, py: 0.25, borderRadius: '5px', bgcolor: 'marca.signal', color: 'marca.signalInk', fontFamily: 'Archivo, sans-serif', fontStretch: '80%', fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Equipo EntreCasas
    </Box>
  );
}

// Lo que se está mirando: todas las comunidades, o la que tiene abierta la ficha.
function BarraContexto() {
  const ficha = useMatch('/plataforma/comunidades/:id');
  const { redPorId } = usePlataforma();
  const red = ficha && redPorId[Number(ficha.params.id)];
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>Administración de plataforma</Typography>
      <Typography noWrap sx={{ fontWeight: 700, lineHeight: 1.3 }}>{red ? red.nombre : 'Todas las comunidades'}</Typography>
    </Box>
  );
}

// Panel del equipo EntreCasas: solo para cuentas de plataforma.
export default function PlataformaProtegida() {
  const { usuario, bloqueados, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!esPlataforma(usuario)) return <Navigate to="/panel" replace />;

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
            <BarraContexto />
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 700, display: { xs: 'none', md: 'block' } }}>
              {nombreCorto(usuario)}
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

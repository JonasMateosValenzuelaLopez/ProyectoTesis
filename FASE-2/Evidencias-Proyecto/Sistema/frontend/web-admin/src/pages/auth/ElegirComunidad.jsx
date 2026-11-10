import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, Paper, Typography } from '@mui/material';
import { ChevronRight as EntrarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { roles } from '../../tokens';
import PanelMarca from '../../components/marca/PanelMarca';
import PasoSesion from '../../components/marca/PasoSesion';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import SelectorTema from '../../components/SelectorTema';
import SelloCargo from '../../components/marca/SelloCargo';

// Después de entrar, quien tiene cargos en varias comunidades elige con cuál trabajar.
// Las comunidades salen de `usuario.comunidades` del perfil y la elegida va en `X-Red-Id`.
// Una vez dentro, se cambia desde el selector de la barra superior.
export default function ElegirComunidad() {
  const navigate = useNavigate();
  const { usuario, porComunidad, cargando, cambiarContexto, cerrarSesion } = useSesion();
  const [entrando, setEntrando] = useState(null);

  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (porComunidad.length === 0) return <Navigate to="/login" replace />;

  const abrir = () => {
    cambiarContexto(entrando.idRed, entrando.idRol);
    navigate('/panel');
  };
  const salir = () => {
    cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca
        titulo={`Hola, ${usuario.nombre}.`}
        texto={`Tienes cargos en ${porComunidad.length} comunidades. Elige con cuál quieres trabajar; después puedes cambiar desde el selector de la barra superior.`}
      />
      <SelectorTema flotante />
      {entrando && <PasoSesion tipo="entrar" nombre={usuario.nombre} detalle={entrando.nombre} alTerminar={abrir} />}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 460, display: 'grid', gap: 3 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
            <PlacaUnidad tipo="" numero="EC" size="sm" />
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="h1">Elige tu comunidad</Typography>
            <Typography color="text.secondary">Toca el cargo con el que vas a trabajar.</Typography>
          </Box>

          <Box sx={{ display: 'grid', gap: 1.5 }}>
            {porComunidad.map(({ comunidad: c, roles: cargos }) => (
              <Paper key={c.idRed} variant="outlined" component="section" aria-labelledby={`red-${c.idRed}`} sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography id={`red-${c.idRed}`} component="h2" sx={{ fontWeight: 700 }}>{c.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.tipo}
                  </Typography>
                </Box>
                {cargos.map((cg) => (
                  <ButtonBase
                    key={cg}
                    onClick={() => setEntrando({ idRed: c.idRed, idRol: cg, nombre: c.nombre })}
                    aria-label={`Entrar a ${c.nombre} como ${roles[cg].label}`}
                    sx={{
                      width: '100%', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center',
                      px: 2, py: 1.25, textAlign: 'left', borderTop: 1, borderColor: 'divider',
                      transition: 'background-color 150ms ease',
                      '&:hover': { bgcolor: 'action.hover' },
                      '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                    }}
                  >
                    <SelloCargo cargo={cg} size={26} />
                    <Typography sx={{ fontWeight: 700 }}>{roles[cg].label}</Typography>
                    <EntrarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </ButtonBase>
                ))}
              </Paper>
            ))}
          </Box>

          <Box>
            <Button color="inherit" onClick={salir}>Cerrar sesión</Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

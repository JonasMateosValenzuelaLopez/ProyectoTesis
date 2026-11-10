import { Box, Link as MuiLink, Typography } from '@mui/material';
import { ArrowBack as VolverIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { CORREO_PRIVACIDAD, SECCIONES_PRIVACIDAD, VERSION_PRIVACIDAD } from '../../config/privacidad';
import SelectorTema from '../../components/SelectorTema';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

// Política de privacidad (pública, sin sesión). Se abre desde «Solicitar acceso» en una pestaña nueva
// para que la persona no pierda lo que ya escribió.
export default function Privacidad() {
  return (
    <Box component="main" sx={{ minHeight: '100vh', bgcolor: 'background.paper', px: 2, py: { xs: 4, md: 6 } }}>
      <SelectorTema flotante />
      <Box component="article" sx={{ maxWidth: 760, mx: 'auto', display: 'grid', gap: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <PlacaUnidad tipo="" numero="EC" size="sm" />
          <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
        </Box>
        <Box>
          <Typography variant="h4" component="h1">Política de privacidad</Typography>
          <Typography color="text.secondary">Versión {VERSION_PRIVACIDAD}</Typography>
        </Box>

        {SECCIONES_PRIVACIDAD.map((s) => (
          <Box component="section" key={s.titulo} sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="h6" component="h2">{s.titulo}</Typography>
            {s.lista && (
              <Box component="ul" sx={{ m: 0, pl: 3, display: 'grid', gap: 0.5 }}>
                {s.lista.map((x) => <Typography component="li" key={x} sx={{ maxWidth: '70ch' }}>{x}</Typography>)}
              </Box>
            )}
            {(s.parrafos ?? []).map((p) => <Typography key={p} sx={{ maxWidth: '70ch' }}>{p}</Typography>)}
          </Box>
        ))}

        <Typography color="text.secondary" variant="body2">
          Dudas o solicitudes sobre tus datos: <MuiLink href={`mailto:${CORREO_PRIVACIDAD}`}>{CORREO_PRIVACIDAD}</MuiLink>
        </Typography>
        <MuiLink component={RouterLink} to="/solicitar-acceso" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, justifySelf: 'start' }}>
          <VolverIcon fontSize="small" /> Ir a Solicitar acceso
        </MuiLink>
      </Box>
    </Box>
  );
}

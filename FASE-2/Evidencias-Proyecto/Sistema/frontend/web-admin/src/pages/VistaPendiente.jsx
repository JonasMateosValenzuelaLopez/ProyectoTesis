import { useLocation } from 'react-router-dom';
import { Box, Chip, Paper, Typography } from '@mui/material';
import { TODAS_LAS_RUTAS } from '../config/navegacion';
import { SECCIONES_PLATAFORMA } from '../config/plataforma';
import { useSesion } from '../context/SesionContext';
import { roles } from '../tokens';

const RUTAS = [...TODAS_LAS_RUTAS, ...SECCIONES_PLATAFORMA.flatMap((s) => s.items)];

// Vista de las secciones que todavía no muestran datos reales:
// - `sinBackend`: la API aún no tiene esa función («Próximamente»).
// - `fase`: la sección se conecta con la API en esa fase del trabajo.
export default function VistaPendiente() {
  const { pathname } = useLocation();
  const { comunidad, cargo, esPlataforma } = useSesion();
  const item = RUTAS.find((i) => i.ruta === pathname);
  const proximamente = !!item?.sinBackend;
  const quien = comunidad ? `${roles[cargo]?.label} en ${comunidad.nombre}` : esPlataforma ? 'parte del equipo EntreCasas' : '';

  return (
    <Box sx={{ display: 'grid', gap: 2, maxWidth: 720 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="h4" component="h1">{item?.texto ?? 'Sección'}</Typography>
        <Chip size="small" variant="outlined" color={proximamente ? 'default' : 'info'} label={proximamente ? 'Próximamente' : 'En conexión'} />
      </Box>
      <Paper variant="outlined" sx={{ p: 3, display: 'grid', gap: 1, borderRadius: 1.5 }}>
        <Typography sx={{ fontWeight: 700 }}>
          {proximamente ? 'Esta función estará disponible próximamente.' : 'Esta sección se está conectando con los datos reales.'}
        </Typography>
        <Typography color="text.secondary">
          {proximamente
            ? 'Todavía no está en el servidor de EntreCasas. Cuando lo esté, aparecerá aquí sin que tengas que hacer nada.'
            : `Se habilita en la fase ${item?.fase ?? '—'} de la conexión con la API.`}
          {quien && ` La ves porque eres ${quien}.`}
        </Typography>
      </Paper>
    </Box>
  );
}

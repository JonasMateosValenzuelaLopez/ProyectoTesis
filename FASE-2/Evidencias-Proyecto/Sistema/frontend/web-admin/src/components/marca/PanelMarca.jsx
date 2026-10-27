import { Box, Typography } from '@mui/material';
import PlacaUnidad from './PlacaUnidad';

// Compartido por Entrar, Solicitar acceso y Recuperar clave.
// Panel de marca: un plano de casas dibujado con placas, algunas encendidas.
export default function PanelMarca({
  titulo = 'La comunidad, casa por casa.',
  texto = 'Cobros, votaciones, comunicados y portería en un solo lugar para la directiva, la administración y la conserjería.',
}) {
  const encendidas = new Set([2, 5, 9, 14, 20, 23]);
  return (
    <Box sx={{ bgcolor: 'marca.sidebar', color: 'marca.sidebarInk', p: { md: 6, lg: 8 }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PlacaUnidad tipo="" numero="EC" size="sm" invertida />
        <Typography sx={{ color: '#fff', fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.3rem' }}>EntreCasas</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 3, maxWidth: 520 }}>
        <Typography component="p" sx={{ color: '#fff', fontFamily: 'Archivo, sans-serif', fontStretch: '115%', fontWeight: 800, fontSize: { md: '2.6rem', lg: '3.2rem' }, lineHeight: 1.05 }}>
          {titulo}
        </Typography>
        <Typography sx={{ fontSize: '1.1rem', maxWidth: '40ch' }}>
          {texto}
        </Typography>
      </Box>
      <Box aria-hidden sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 0.75, maxWidth: 520 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <Box key={i} sx={{
            aspectRatio: '1', borderRadius: '4px', border: '1.5px solid',
            borderColor: encendidas.has(i) ? 'marca.bronzeOnSidebar' : 'rgba(199, 210, 205, 0.25)',
            bgcolor: encendidas.has(i) ? 'marca.bronzeOnSidebar' : 'transparent',
          }} />
        ))}
      </Box>
    </Box>
  );
}

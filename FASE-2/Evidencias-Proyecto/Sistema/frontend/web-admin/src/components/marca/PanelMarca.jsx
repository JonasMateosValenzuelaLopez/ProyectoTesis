import { Box, Typography } from '@mui/material';
import PlacaUnidad from './PlacaUnidad';

// Compartido por Entrar, Solicitar acceso y Recuperar clave.
// Panel de marca: foto de un edificio teñida de fondo y, abajo, un plano de casas con placas, algunas encendidas.
export default function PanelMarca({
  titulo = 'La comunidad, casa por casa.',
  texto = 'Cobros, votaciones, comunicados y portería en un solo lugar para la directiva, la administración y la conserjería.',
}) {
  const encendidas = new Set([2, 5, 9, 14, 20, 23]);
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', bgcolor: 'marca.sidebar', color: 'marca.sidebarInk', p: { md: 6, lg: 8 },
      display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', gap: 6,
      '& > :not(.ec-foto)': { position: 'relative', zIndex: 1 },
    }}>
      {/* Foto de fondo: un edificio residencial, teñida con el color del menú para que el texto se lea */}
      <Box
        className="ec-foto" aria-hidden
        sx={(t) => ({
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'url(/img/login-edificio.jpg)', backgroundSize: 'cover', backgroundPosition: 'center 30%',
          filter: 'grayscale(0.35)',
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundColor: t.palette.marca.sidebar, opacity: t.palette.mode === 'dark' ? 0.84 : 0.78,
          },
        })}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PlacaUnidad tipo="" numero="EC" size="sm" invertida />
        <Typography sx={{ color: 'marca.sidebarStrong', fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.3rem' }}>EntreCasas</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 3, maxWidth: 520 }}>
        <Typography component="p" sx={{ color: 'marca.sidebarStrong', fontFamily: 'Archivo, sans-serif', fontStretch: '115%', fontWeight: 800, fontSize: { md: '2.6rem', lg: '3.2rem' }, lineHeight: 1.05 }}>
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
            borderColor: encendidas.has(i) ? 'marca.placaSidebar' : 'marca.sidebarDot',
            bgcolor: encendidas.has(i) ? 'marca.placaSidebar' : 'transparent',
          }} />
        ))}
      </Box>
    </Box>
  );
}

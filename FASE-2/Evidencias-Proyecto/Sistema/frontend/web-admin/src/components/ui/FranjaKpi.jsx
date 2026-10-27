import { Box, LinearProgress, Paper, Typography } from '@mui/material';

// Indicadores en una sola franja con divisores, en vez de tarjetas sueltas.
export default function FranjaKpi({ items }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'grid', borderRadius: 1.5, mb: 3, overflow: 'hidden',
        gridTemplateColumns: { xs: '1fr 1fr', md: `repeat(${items.length}, 1fr)` },
      }}
    >
      {items.map((k) => (
        <Box key={k.etiqueta} sx={{ p: 2, borderLeft: { md: 1 }, borderTop: { xs: 1, md: 0 }, borderColor: { xs: 'divider', md: 'divider' }, '&:first-of-type': { borderLeft: 0 }, display: 'grid', gap: 0.25, alignContent: 'start' }}>
          <Typography variant="body2" color="text.secondary">{k.etiqueta}</Typography>
          <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.6rem', lineHeight: 1.2, color: k.color ?? 'text.primary' }}>
            {k.valor}
          </Typography>
          {k.progreso != null && (
            <LinearProgress variant="determinate" value={k.progreso} color="success" sx={{ mt: 0.75, height: 5, borderRadius: 1.5, bgcolor: 'divider' }} />
          )}
          {k.nota && <Typography variant="caption" color="text.secondary">{k.nota}</Typography>}
        </Box>
      ))}
    </Paper>
  );
}

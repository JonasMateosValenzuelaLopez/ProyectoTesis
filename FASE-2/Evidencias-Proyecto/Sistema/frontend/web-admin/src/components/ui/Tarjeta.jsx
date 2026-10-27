import { Box, Paper, Typography } from '@mui/material';

// Contenedor con título y acción opcional a la derecha.
export default function Tarjeta({ titulo, extra, children, sx }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: 'grid', gap: 2, alignContent: 'start', minWidth: 0, ...sx }}>
      {(titulo || extra) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, flexWrap: 'wrap' }}>
          {titulo && <Typography variant="h6" component="h2">{titulo}</Typography>}
          {extra && <Box sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{extra}</Box>}
        </Box>
      )}
      {children}
    </Paper>
  );
}

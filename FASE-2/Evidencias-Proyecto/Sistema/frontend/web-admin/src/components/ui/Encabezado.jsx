import { Box, Typography } from '@mui/material';

// Encabezado de cada vista: contexto pequeño arriba, título y acciones a la derecha.
export default function Encabezado({ contexto, titulo, descripcion, acciones }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, mb: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        {contexto && <Typography color="text.secondary" variant="body2">{contexto}</Typography>}
        <Typography variant="h4" component="h1">{titulo}</Typography>
        {descripcion && <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: '65ch' }}>{descripcion}</Typography>}
      </Box>
      {acciones && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>{acciones}</Box>}
    </Box>
  );
}

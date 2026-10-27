import { Chip } from '@mui/material';
import { ESTADOS_PAGO } from '../../config/estadosPago';

// Chip con el estado del cobro de una unidad.
export default function EstadoPago({ estado, size = 'small' }) {
  const e = ESTADOS_PAGO[estado];
  if (!e) return null;
  return (
    <Chip
      size={size}
      label={e.texto}
      sx={{ bgcolor: `${e.color}.light`, color: `${e.color}.main` }}
    />
  );
}

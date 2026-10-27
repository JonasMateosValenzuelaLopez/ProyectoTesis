import { Chip } from '@mui/material';

export default function EstadoComunidad({ estado }) {
  return estado === 'suspendida'
    ? <Chip size="small" color="error" variant="outlined" label="Suspendida" />
    : <Chip size="small" color="success" variant="outlined" label="Activa" />;
}

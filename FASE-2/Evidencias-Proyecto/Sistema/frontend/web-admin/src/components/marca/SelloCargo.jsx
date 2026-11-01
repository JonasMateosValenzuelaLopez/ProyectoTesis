import { Box } from '@mui/material';
import { roles } from '../../tokens';

// Sello del cargo: directiva en pátina (lo oficial), personal en tinta, residentes con contorno.
const ESTILOS = {
  directiva: { bgcolor: 'info.main', color: 'info.contrastText' },
  staff: { bgcolor: 'text.primary', color: 'background.paper' },
  residente: { border: '1.5px solid', borderColor: 'text.secondary', color: 'text.secondary' },
};

export default function SelloCargo({ cargo, conTexto = false, size = 22, sx }) {
  const rol = roles[cargo];
  if (!rol) return null;
  const sello = (
    <Box
      component="span"
      aria-hidden={conTexto}
      title={conTexto ? undefined : rol.label}
      sx={{
        display: 'inline-grid', placeItems: 'center', flexShrink: 0,
        width: size, height: size, borderRadius: `${Math.round(size / 4.4)}px`,
        fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: size * 0.5,
        ...ESTILOS[rol.family],
        ...(conTexto ? {} : sx),
      }}
    >
      {rol.initial}
    </Box>
  );
  if (!conTexto) return sello;
  return (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, fontWeight: 700, ...sx }}>
      {sello}
      {rol.label}
    </Box>
  );
}

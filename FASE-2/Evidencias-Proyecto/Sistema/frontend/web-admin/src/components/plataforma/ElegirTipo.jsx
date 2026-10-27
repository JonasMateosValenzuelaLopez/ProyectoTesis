import { Box, ButtonBase, Typography } from '@mui/material';
import { ApartmentOutlined, HolidayVillageOutlined, MapsHomeWorkOutlined } from '@mui/icons-material';

const TIPOS = [
  { tipo: 'Edificio', icono: <ApartmentOutlined />, texto: 'Departamentos por piso. Suele tener conserjería y administrador.' },
  { tipo: 'Condominio', icono: <HolidayVillageOutlined />, texto: 'Casas a lo largo de un pasaje, con espacios comunes y administración.' },
  { tipo: 'Villa', icono: <MapsHomeWorkOutlined />, texto: 'Casas en manzanas. Normalmente sin administrador: la directiva lo hace todo.' },
];

// Tarjetas para elegir el tipo de comunidad; el tipo decide el plano y los módulos sugeridos.
export default function ElegirTipo({ valor, onChange }) {
  return (
    <Box role="radiogroup" aria-label="Tipo de comunidad" sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' } }}>
      {TIPOS.map((t) => {
        const elegido = valor === t.tipo;
        return (
          <ButtonBase
            key={t.tipo} role="radio" aria-checked={elegido} onClick={() => onChange(t.tipo)}
            sx={{
              display: 'grid', gap: 0.75, justifyItems: 'start', textAlign: 'left', p: 2, borderRadius: 1.5,
              border: '1px solid', borderColor: elegido ? 'primary.main' : 'divider', bgcolor: 'background.paper',
              boxShadow: (t) => (elegido ? `inset 0 0 0 1px ${t.palette.primary.main}` : 'none'),
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
              '&:hover': { borderColor: elegido ? 'primary.main' : 'text.secondary' },
              '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
              '& svg': { fontSize: 28, color: elegido ? 'primary.main' : 'text.secondary' },
            }}
          >
            {t.icono}
            <Typography sx={{ fontWeight: 700 }}>{t.tipo}</Typography>
            <Typography variant="body2" color="text.secondary">{t.texto}</Typography>
          </ButtonBase>
        );
      })}
    </Box>
  );
}

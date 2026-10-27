import { Box } from '@mui/material';
import { tipoUnidad } from '../../utils/unidades';

// Placa de bronce con el número de la vivienda: el elemento firma de EntreCasas.
// El número reserva dos cifras para que las placas 1 a 99 midan lo mismo y los nombres queden alineados.
const TAMANOS = {
  sm: { pad: '3px', radio: '7px', interior: '3px 8px 2px', borde: 1.5, radioInt: '4px', numero: '1.1rem', etiqueta: '0.5rem' },
  md: { pad: '6px', radio: '10px', interior: '6px 14px 4px', borde: 2, radioInt: '6px', numero: '2rem', etiqueta: '0.62rem' },
  lg: { pad: '8px', radio: '12px', interior: '8px 18px 6px', borde: 2.5, radioInt: '7px', numero: '3.2rem', etiqueta: '0.72rem' },
};

// Con `unidad` (fila de `unidades`) deduce tipo y número; `tipo` y `numero` sirven para la placa de la marca.
export default function PlacaUnidad({ unidad, tipo: tipoMarca, numero: numeroMarca, size = 'md', invertida = false, sx }) {
  const t = TAMANOS[size];
  const tipo = unidad ? tipoUnidad(unidad) : tipoMarca ?? 'Casa';
  const numero = unidad ? unidad.numero_identificador : numeroMarca;
  const etiqueta = tipo === 'Departamento' ? 'DEPTO' : tipo.toUpperCase();
  return (
    <Box
      aria-label={`${tipo} ${numero}`}
      sx={{
        display: 'inline-grid', placeItems: 'center', flexShrink: 0,
        p: t.pad, borderRadius: t.radio,
        bgcolor: invertida ? 'background.paper' : 'bronce.main',
        color: invertida ? 'marca.sidebar' : 'bronce.contrastText',
        ...sx,
      }}
    >
      <Box sx={{ display: 'grid', placeItems: 'center', border: `${t.borde}px solid currentColor`, borderRadius: t.radioInt, p: t.interior, lineHeight: 1 }}>
        {etiqueta && (
          <Box component="span" sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '80%', fontWeight: 700, fontSize: t.etiqueta, letterSpacing: '0.14em' }}>
            {etiqueta}
          </Box>
        )}
        <Box component="span" sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '125%', fontWeight: 800, fontSize: t.numero, fontVariantNumeric: 'tabular-nums', minWidth: '2ch', textAlign: 'center' }}>
          {numero}
        </Box>
      </Box>
    </Box>
  );
}

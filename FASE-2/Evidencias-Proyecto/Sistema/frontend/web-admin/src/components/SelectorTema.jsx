import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import {
  Check as CheckIcon, DarkModeOutlined as OscuroIcon, LightModeOutlined as ClaroIcon, SettingsBrightnessOutlined as SistemaIcon,
} from '@mui/icons-material';
import { useTemaPreferido } from '../context/TemaContext';
import { ESCALA_MAX, ESCALA_MIN, ESCALA_PASO, ajustarEscala } from '../utils/escalaLetra';

const OPCIONES = [
  { valor: 'claro', texto: 'Claro', icono: <ClaroIcon fontSize="small" /> },
  { valor: 'oscuro', texto: 'Oscuro', icono: <OscuroIcon fontSize="small" /> },
  { valor: 'sistema', texto: 'Como el dispositivo', icono: <SistemaIcon fontSize="small" /> },
];

const ESPERA_REPETIR = 450; // ms manteniendo apretado antes de que empiece a repetirse
const CADA = 150; // ms entre un paso y el siguiente mientras se mantiene apretado

// A− y A+: un clic cambia 5 %; si se mantiene apretado, sigue cambiando hasta el mínimo o el máximo.
// Las letras de los botones y el porcentaje van en px para que el control no se mueva mientras cambia.
function TamanoLetra() {
  const { escala, setEscala } = useTemaPreferido();
  const actual = useRef(escala);
  useEffect(() => { actual.current = escala; }, [escala]);
  const espera = useRef(null);
  const repetir = useRef(null);

  const detener = useCallback(() => {
    clearTimeout(espera.current);
    clearInterval(repetir.current);
    espera.current = null;
    repetir.current = null;
  }, []);

  // Da un paso y avisa si todavía se puede seguir en esa dirección
  const paso = useCallback((dir) => {
    const siguiente = ajustarEscala(actual.current + dir * ESCALA_PASO);
    if (siguiente === actual.current) return false;
    actual.current = siguiente;
    setEscala(siguiente);
    return dir > 0 ? siguiente < ESCALA_MAX : siguiente > ESCALA_MIN;
  }, [setEscala]);

  const empezar = (dir) => {
    detener();
    if (!paso(dir)) return;
    espera.current = setTimeout(() => {
      repetir.current = setInterval(() => { if (!paso(dir)) detener(); }, CADA);
    }, ESPERA_REPETIR);
  };

  useEffect(() => detener, [detener]);

  const tecla = (dir) => {
    const limite = dir > 0 ? escala >= ESCALA_MAX : escala <= ESCALA_MIN;
    return (
      <IconButton
        aria-label={dir > 0 ? 'Agrandar letra' : 'Achicar letra'} disabled={limite}
        // Mouse o dedo: paso al apretar y repetición mientras se mantiene. Teclado (Enter o Espacio): un paso por pulsación.
        onPointerDown={(e) => { if (e.button === 0) { e.currentTarget.setPointerCapture?.(e.pointerId); empezar(dir); } }}
        onPointerUp={detener} onPointerCancel={detener} onLostPointerCapture={detener}
        onClick={(e) => { if (e.detail === 0) paso(dir); }}
        onContextMenu={(e) => e.preventDefault()}
        sx={{ width: 48, height: 44, borderRadius: '12px', border: 1.5, borderColor: 'divider', color: 'text.primary', touchAction: 'none', userSelect: 'none' }}
      >
        <Box component="span" sx={{ fontWeight: 800, fontSize: dir > 0 ? '20px' : '14px', lineHeight: 1 }}>{dir > 0 ? 'A+' : 'A−'}</Box>
      </IconButton>
    );
  };

  return (
    // Las flechas y las letras no deben mover la selección del menú mientras se usa este control
    <Box sx={{ px: 2, pt: 1, pb: 1.5 }} onKeyDown={(e) => { if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation(); }}>
      <Typography variant="overline" color="text.secondary" component="p" sx={{ fontSize: '11px' }}>Tamaño de letra</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
        {tecla(-1)}
        <Typography aria-live="polite" sx={{ flex: 1, textAlign: 'center', fontWeight: 800, fontSize: '18px', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(escala * 100)} %
        </Typography>
        {tecla(1)}
      </Box>
      <Typography sx={{ mt: 1, fontSize: '12px', color: 'text.secondary', maxWidth: 220 }}>
        Mantén apretado para avanzar rápido.
      </Typography>
      {escala !== 1 && (
        <Button size="small" onClick={() => { detener(); setEscala(1); }} sx={{ mt: 0.5, px: 0, fontSize: '13px' }}>
          Volver al tamaño normal
        </Button>
      )}
    </Box>
  );
}

// Botón de apariencia: claro, oscuro o lo que use el dispositivo, y el tamaño de letra.
// `flotante` lo deja en la esquina superior derecha, para las pantallas sin barra (entrar, recuperar clave).
export default function SelectorTema({ flotante = false }) {
  const { preferencia, setPreferencia, modo } = useTemaPreferido();
  const [ancla, setAncla] = useState(null);
  const actual = preferencia === 'sistema' ? OPCIONES[2] : modo === 'dark' ? OPCIONES[1] : OPCIONES[0];

  const boton = (
    <>
      <Tooltip title="Apariencia y tamaño de letra">
        <IconButton
          aria-label={`Apariencia: ${actual.texto.toLowerCase()}. Tamaño de letra`} aria-haspopup="menu" aria-expanded={Boolean(ancla)}
          onClick={(e) => setAncla(e.currentTarget)} sx={{ color: 'text.secondary' }}
        >
          {actual.icono}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={ancla} open={Boolean(ancla)} onClose={() => setAncla(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { variant: 'outlined', sx: { mt: 0.5, minWidth: 240 } } }}
      >
        {OPCIONES.map((o) => (
          <MenuItem key={o.valor} selected={o.valor === preferencia} onClick={() => { setPreferencia(o.valor); setAncla(null); }}>
            <ListItemIcon>{o.icono}</ListItemIcon>
            <ListItemText>{o.texto}</ListItemText>
            {o.valor === preferencia && <CheckIcon fontSize="small" sx={{ ml: 2, color: 'bronce.main' }} />}
          </MenuItem>
        ))}
        <Divider />
        <TamanoLetra />
      </Menu>
    </>
  );

  if (!flotante) return boton;
  return <Box sx={{ position: 'fixed', top: 12, right: 12, zIndex: 'appBar' }}>{boton}</Box>;
}

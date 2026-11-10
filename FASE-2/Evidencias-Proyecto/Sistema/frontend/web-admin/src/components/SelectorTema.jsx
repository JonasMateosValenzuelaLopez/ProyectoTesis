import { useState } from 'react';
import { Box, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import {
  Check as CheckIcon, DarkModeOutlined as OscuroIcon, LightModeOutlined as ClaroIcon, SettingsBrightnessOutlined as SistemaIcon,
} from '@mui/icons-material';
import { useTemaPreferido } from '../context/TemaContext';

const OPCIONES = [
  { valor: 'claro', texto: 'Claro', icono: <ClaroIcon fontSize="small" /> },
  { valor: 'oscuro', texto: 'Oscuro', icono: <OscuroIcon fontSize="small" /> },
  { valor: 'sistema', texto: 'Como el dispositivo', icono: <SistemaIcon fontSize="small" /> },
];

// Botón de apariencia: claro, oscuro o lo que use el dispositivo.
// `flotante` lo deja en la esquina superior derecha, para las pantallas sin barra (entrar, recuperar clave).
export default function SelectorTema({ flotante = false }) {
  const { preferencia, setPreferencia, modo } = useTemaPreferido();
  const [ancla, setAncla] = useState(null);
  const actual = preferencia === 'sistema' ? OPCIONES[2] : modo === 'dark' ? OPCIONES[1] : OPCIONES[0];

  const boton = (
    <>
      <Tooltip title="Apariencia">
        <IconButton
          aria-label={`Apariencia: ${actual.texto.toLowerCase()}`} aria-haspopup="menu" aria-expanded={Boolean(ancla)}
          onClick={(e) => setAncla(e.currentTarget)} sx={{ color: 'text.secondary' }}
        >
          {actual.icono}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={ancla} open={Boolean(ancla)} onClose={() => setAncla(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { variant: 'outlined', sx: { mt: 0.5, minWidth: 220 } } }}
      >
        {OPCIONES.map((o) => (
          <MenuItem key={o.valor} selected={o.valor === preferencia} onClick={() => { setPreferencia(o.valor); setAncla(null); }}>
            <ListItemIcon>{o.icono}</ListItemIcon>
            <ListItemText>{o.texto}</ListItemText>
            {o.valor === preferencia && <CheckIcon fontSize="small" sx={{ ml: 2, color: 'bronce.main' }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );

  if (!flotante) return boton;
  return <Box sx={{ position: 'fixed', top: 12, right: 12, zIndex: 'appBar' }}>{boton}</Box>;
}

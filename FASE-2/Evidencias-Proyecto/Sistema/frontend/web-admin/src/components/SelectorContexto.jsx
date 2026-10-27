import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ButtonBase, Menu, MenuItem, ListSubheader, ListItemIcon, ListItemText, Typography } from '@mui/material';
import { ExpandMore as ExpandIcon, Check as CheckIcon } from '@mui/icons-material';
import { useSesion } from '../context/SesionContext';
import { roles } from '../tokens';
import SelloCargo from './marca/SelloCargo';

// Selector de comunidad y cargo. Una persona puede tener varios cargos en
// varias comunidades (tabla membresias); aquí elige con cuál está actuando.
export default function SelectorContexto() {
  const { comunidad, cargo, porComunidad, cambiarContexto } = useSesion();
  const navigate = useNavigate();
  const [ancla, setAncla] = useState(null);

  const elegir = (idRed, nuevoCargo) => {
    cambiarContexto(idRed, nuevoCargo);
    setAncla(null);
    navigate('/panel');
  };

  return (
    <>
      <ButtonBase
        onClick={(e) => setAncla(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={Boolean(ancla)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, textAlign: 'left',
          border: 1, borderColor: 'divider', borderRadius: 2, px: 1.5, py: 0.75,
          transition: 'border-color 150ms ease',
          '&:hover': { borderColor: 'text.secondary' },
          '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
        }}
      >
        <SelloCargo cargo={cargo} size={26} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" component="div" noWrap sx={{ lineHeight: 1.2 }}>
            {comunidad.nombre}
          </Typography>
          <Typography variant="body2" component="div" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {roles[cargo].label}
          </Typography>
        </Box>
        <ExpandIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </ButtonBase>

      <Menu anchorEl={ancla} open={Boolean(ancla)} onClose={() => setAncla(null)} slotProps={{ paper: { variant: 'outlined', sx: { minWidth: 260, mt: 0.5 } } }}>
        {porComunidad.flatMap(({ comunidad: c, cargos }) => [
          <ListSubheader key={`h${c.id}`} sx={{ lineHeight: '32px', fontWeight: 700 }}>
            {c.nombre} · {c.tipo}
          </ListSubheader>,
          ...cargos.map((cg) => {
            const activo = c.id === comunidad.id && cg === cargo;
            return (
              <MenuItem key={`${c.id}-${cg}`} selected={activo} onClick={() => elegir(c.id, cg)}>
                <ListItemIcon><SelloCargo cargo={cg} /></ListItemIcon>
                <ListItemText primary={roles[cg].label} />
                {activo && <CheckIcon fontSize="small" color="primary" />}
              </MenuItem>
            );
          }),
        ])}
      </Menu>
    </>
  );
}

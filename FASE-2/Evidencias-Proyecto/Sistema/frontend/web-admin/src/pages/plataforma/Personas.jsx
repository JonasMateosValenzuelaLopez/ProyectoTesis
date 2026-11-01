import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { MoreVert as MasIcon } from '@mui/icons-material';
import { usePlataforma } from '../../context/PlataformaContext';
import { useSesion } from '../../context/SesionContext';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';

const MAXIMO = 40;
const COLUMNAS = 'minmax(0, 1.1fr) minmax(0, 1fr) 40px';
const FILTROS = {
  todas: (p) => p,
  cargo: (p) => p.comunidades.some((c) => c.cargos.length > 0),
  bloqueadas: (p) => p.bloqueado,
};

const papel = (c) => (c.cargos.length ? c.cargos.map((x) => roles[x].label).join(', ') : c.relacion ?? 'Residente');
const soloDigitos = (s) => s.replace(/[^0-9kK]/g, '').toLowerCase();

// Búsqueda de una persona en todas las comunidades, para atenderla cuando escribe a soporte.
export default function Personas() {
  const { personas, acciones } = usePlataforma();
  const { usuario } = useSesion();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [confirmar, setConfirmar] = useState(null);
  const [menu, setMenu] = useState(null);

  const texto = busqueda.trim().toLowerCase();
  const digitos = soloDigitos(busqueda);
  const lista = personas
    .filter(FILTROS[filtro])
    .filter((p) => !texto
      || [p.nombre, p.correo, ...p.comunidades.map((c) => c.red)].join(' ').toLowerCase().includes(texto)
      || (digitos.length >= 3 && soloDigitos(p.rut).includes(digitos)));
  const bloqueadas = personas.filter((p) => p.bloqueado).length;

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Encabezado
        titulo="Personas"
        descripcion="Busca a quien escribe a soporte por RUT, nombre o correo. Bloquear una cuenta le impide entrar a todas sus comunidades."
      />
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField size="small" label="RUT, nombre o correo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ flex: '1 1 280px', maxWidth: 420 }} autoFocus />
        <ToggleButtonGroup exclusive size="small" value={filtro} onChange={(_, v) => v && setFiltro(v)}>
          <ToggleButton value="todas">Todas</ToggleButton>
          <ToggleButton value="cargo">Con cargo</ToggleButton>
          <ToggleButton value="bloqueadas">Bloqueadas{bloqueadas ? ` (${bloqueadas})` : ''}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {lista.length > MAXIMO ? `Mostrando ${MAXIMO} de ${lista.length.toLocaleString('es-CL')}. Escribe para acotar.` : `${lista.length} ${lista.length === 1 ? 'persona' : 'personas'}`}
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
        {/* Encabezado de columnas solo en pantallas anchas; en el celular cada persona es una fila apilada */}
        <Box aria-hidden sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: COLUMNAS, gap: 2, px: 2.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
          {['Persona', 'Comunidades', ''].map((t) => (
            <Typography key={t} variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{t}</Typography>
          ))}
        </Box>
        {lista.slice(0, MAXIMO).map((p, i) => (
          <Box key={p.rut} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr auto', md: COLUMNAS }, gap: { xs: 0.75, md: 2 }, alignItems: 'center', px: { xs: 2, md: 2.5 }, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>{p.nombre}</Typography>
                {p.plataforma && <Chip size="small" label="Equipo EntreCasas" sx={{ bgcolor: 'marca.signal', color: 'marca.signalInk', fontWeight: 700 }} />}
                {p.bloqueado && <Chip size="small" color="error" label="Bloqueada" />}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{p.rut} · {p.correo}</Typography>
            </Box>
            <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 2, md: 'auto' }, minWidth: 0, display: 'grid', gap: 0.25 }}>
              {p.comunidades.map((c) => (
                <Typography key={c.id_red} variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                  {c.red} <Box component="span" sx={{ color: 'text.secondary' }}>· {papel(c)}</Box>
                  {c.estado === 'Invitado' && <Box component="span" sx={{ color: 'warning.main', fontWeight: 700 }}> · invitación pendiente</Box>}
                </Typography>
              ))}
              {p.comunidades.length === 0 && <Typography variant="body2" color="text.secondary">Sin comunidad</Typography>}
            </Box>
            <Box sx={{ gridColumn: { xs: 2, md: 'auto' }, gridRow: { xs: 1, md: 'auto' }, justifySelf: 'end' }}>
              <IconButton aria-label={`Acciones para ${p.nombre}`} onClick={(e) => setMenu({ ancla: e.currentTarget, persona: p })}>
                <MasIcon />
              </IconButton>
            </Box>
          </Box>
        ))}
        {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Nadie calza con la búsqueda.</Typography>}
      </Paper>

      <Menu anchorEl={menu?.ancla} open={!!menu} onClose={() => setMenu(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {menu && <MenuItem onClick={() => { acciones.reenviarAcceso(menu.persona); setMenu(null); }}>Reenviar acceso</MenuItem>}
        {menu && menu.persona.rut !== usuario.rut && (menu.persona.bloqueado
          ? <MenuItem onClick={() => { acciones.bloquear(menu.persona, false); setMenu(null); }}>Desbloquear</MenuItem>
          : <MenuItem onClick={() => { setConfirmar(menu.persona); setMenu(null); }} sx={{ color: 'error.main' }}>Bloquear cuenta…</MenuItem>)}
      </Menu>

      {confirmar && (
        <Dialog open onClose={() => setConfirmar(null)} maxWidth="xs" fullWidth>
          <DialogTitle>¿Bloquear a {confirmar.nombre}?</DialogTitle>
          <DialogContent>
            <Typography color="text.secondary">
              No podrá entrar al panel ni a la app{confirmar.comunidades.length ? ` en ${confirmar.comunidades.map((c) => c.red).join(', ')}` : ''}. Sus datos y cargos se conservan y puedes desbloquearla cuando quieras.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setConfirmar(null)}>Cancelar</Button>
            <Button color="error" variant="contained" onClick={() => { acciones.bloquear(confirmar, true); setConfirmar(null); }}>Bloquear cuenta</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

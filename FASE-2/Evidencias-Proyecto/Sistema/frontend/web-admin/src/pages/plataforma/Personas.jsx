import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { usePlataforma } from '../../context/PlataformaContext';
import { useSesion } from '../../context/SesionContext';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';

const MAXIMO = 40;
const RELACION = { propietario: 'Propietario', arrendatario: 'Arrendatario' };
const FILTROS = {
  todas: (p) => p,
  cargo: (p) => p.comunidades.some((c) => c.cargos.length > 0),
  bloqueadas: (p) => p.bloqueado,
};

const papel = (c) => (c.cargos.length ? c.cargos.map((x) => roles[x].label).join(', ') : RELACION[c.relacion] ?? 'Residente');
const soloDigitos = (s) => s.replace(/[^0-9kK]/g, '').toLowerCase();

// Búsqueda de una persona en todas las comunidades, para atenderla cuando escribe a soporte.
export default function Personas() {
  const { personas, acciones } = usePlataforma();
  const { usuario } = useSesion();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [confirmar, setConfirmar] = useState(null);

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
        contexto="Plataforma EntreCasas"
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

      <Paper variant="outlined" sx={{ borderRadius: 3 }}>
        {lista.slice(0, MAXIMO).map((p, i) => (
          <Box key={p.rut} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, gap: 1.5, alignItems: 'center', px: 2.5, py: 1.75, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Box sx={{ minWidth: 0, display: 'grid', gap: 0.75 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography sx={{ fontWeight: 700 }}>{p.nombre}</Typography>
                {p.plataforma && <Chip size="small" label="Equipo EntreCasas" sx={{ bgcolor: 'marca.signal', color: 'marca.signalInk', fontWeight: 700 }} />}
                {p.bloqueado && <Chip size="small" color="error" label="Bloqueada" />}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{p.rut} · {p.correo}</Typography>
              {p.comunidades.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  {p.comunidades.map((c) => (
                    <Chip key={c.idRed} size="small" variant="outlined" label={`${c.red} · ${papel(c)}${c.estado === 'invitado' ? ' · invitación pendiente' : ''}`} />
                  ))}
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button size="small" variant="outlined" onClick={() => acciones.reenviarAcceso(p)}>Reenviar acceso</Button>
              {p.rut !== usuario.rut && (p.bloqueado
                ? <Button size="small" onClick={() => acciones.bloquear(p, false)}>Desbloquear</Button>
                : <Button size="small" color="error" onClick={() => setConfirmar(p)}>Bloquear</Button>)}
            </Box>
          </Box>
        ))}
        {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Nadie calza con la búsqueda.</Typography>}
      </Paper>

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

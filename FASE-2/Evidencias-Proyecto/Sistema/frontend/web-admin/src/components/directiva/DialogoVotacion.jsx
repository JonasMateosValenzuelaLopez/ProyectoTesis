import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon } from '@mui/icons-material';
import { useDirectiva } from '../../context/DirectivaContext';

const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const OPCIONES = { Votación: ['A favor', 'En contra', 'Abstención'], Encuesta: ['', ''] };
const inicial = () => ({ tipo: 'Votación', titulo: '', descripcion: '', opciones: OPCIONES['Votación'], fecha_cierre: enDias(7), quorum: 50 });

// Abrir una votación (con quórum, para decisiones) o una encuesta (consulta sin quórum).
// Las opciones no se pueden cambiar una vez abierta, porque ya pueden existir votos.
export default function DialogoVotacion({ open, onClose }) {
  const { totalUnidades, acciones } = useDirectiva();
  const [form, setForm] = useState(inicial);
  const opciones = form.opciones.map((o) => o.trim()).filter(Boolean);
  const repetidas = new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length;
  const valido = form.titulo.trim() && opciones.length >= 2 && !repetidas && form.fecha_cierre > enDias(0);

  const cerrar = () => { setForm(inicial()); onClose(); };
  const cambiarTipo = (tipo) => setForm({ ...form, tipo, opciones: OPCIONES[tipo] });
  const cambiarOpcion = (i, texto) => setForm({ ...form, opciones: form.opciones.map((o, j) => (j === i ? texto : o)) });

  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.crearVotacion({
      tipo: form.tipo, titulo: form.titulo.trim(), descripcion: form.descripcion.trim() || null, fecha_cierre: form.fecha_cierre,
      quorum: form.tipo === 'Votación' ? Number(form.quorum) : null,
    }, opciones);
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Abrir votación o encuesta</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <ToggleButtonGroup exclusive fullWidth value={form.tipo} onChange={(_, v) => v && cambiarTipo(v)}>
          <ToggleButton value="Votación">Votación</ToggleButton>
          <ToggleButton value="Encuesta">Encuesta</ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {form.tipo === 'Votación'
            ? 'Para decidir algo. El resultado vale solo si vota el mínimo de unidades que indiques.'
            : 'Para conocer la opinión de los vecinos. No necesita quórum.'}
        </Typography>
        <TextField required label="Pregunta o título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <TextField label="Detalle" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} multiline minRows={2} helperText="Costos, plazos o lo que los vecinos necesiten saber para votar." />

        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" component="h3">Opciones</Typography>
          {form.opciones.map((o, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" fullWidth label={`Opción ${i + 1}`} value={o} onChange={(e) => cambiarOpcion(i, e.target.value)} />
              <Tooltip title="Quitar opción">
                <span>
                  <IconButton aria-label={`Quitar opción ${i + 1}`} disabled={form.opciones.length <= 2} onClick={() => setForm({ ...form, opciones: form.opciones.filter((_, j) => j !== i) })}>
                    <QuitarIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
          {repetidas && <Typography variant="body2" color="error">Hay opciones repetidas.</Typography>}
          <Button startIcon={<AddIcon />} onClick={() => setForm({ ...form, opciones: [...form.opciones, ''] })} sx={{ justifySelf: 'start' }} disabled={form.opciones.length >= 6}>
            Agregar opción
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField required label="Cierra el" type="date" value={form.fecha_cierre} onChange={(e) => setForm({ ...form, fecha_cierre: e.target.value })} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: enDias(1) } }} />
          {form.tipo === 'Votación' && (
            <TextField
              label="Quórum mínimo" type="number" value={form.quorum} onChange={(e) => setForm({ ...form, quorum: e.target.value })}
              helperText={`${Math.ceil((Number(form.quorum) / 100) * totalUnidades) || 0} de ${totalUnidades} unidades`}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { min: 1, max: 100 } }}
            />
          )}
        </Box>
        <Alert severity="info" variant="outlined">
          Se avisará a las {totalUnidades} unidades por la app y por correo. Cada unidad vota una vez y las opciones no se pueden cambiar después.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Abrir y avisar</Button>
      </DialogActions>
    </Dialog>
  );
}

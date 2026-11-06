import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon } from '@mui/icons-material';
import { useDirectiva } from '../../context/DirectivaContext';
import {
  MAX_DETALLE, MAX_DIAS_ABIERTA, MAX_OPCION, MAX_OPCIONES, MAX_TITULO, MIN_OPCIONES, fechaEnDias as enDias,
} from '../../utils/votaciones';

const OPCIONES = { Votación: ['A favor', 'En contra', 'Abstención'], Encuesta: ['', ''] };
const inicial = () => ({ tipo: 'Votación', titulo: '', descripcion: '', opciones: OPCIONES['Votación'], fecha_cierre: enDias(7), quorum: 50 });

// Abrir una votación (con quórum, para decisiones) o una encuesta (consulta sin quórum).
// Las opciones no se pueden cambiar una vez abierta, porque ya pueden existir votos.
// Mismas reglas que la API: cierre después de hoy y hasta 90 días, quórum entero de 1 a 100,
// y el aviso llega solo a los titulares (si ninguna vivienda tiene titular, no se puede abrir).
export default function DialogoVotacion({ open, onClose }) {
  const { totalUnidades, viviendasConTitular, acciones } = useDirectiva();
  const [form, setForm] = useState(inicial);
  const opciones = form.opciones.map((o) => o.trim()).filter(Boolean);
  const repetidas = new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length;
  const quorum = Number(form.quorum);
  const errorQuorum = form.tipo === 'Votación' && !(Number.isInteger(quorum) && quorum >= 1 && quorum <= 100) ? 'Debe ser un porcentaje entre 1 y 100' : null;
  const errorCierre = !form.fecha_cierre || form.fecha_cierre <= enDias(0) ? 'Debe ser posterior a hoy'
    : form.fecha_cierre > enDias(MAX_DIAS_ABIERTA) ? `Puede estar abierta hasta ${MAX_DIAS_ABIERTA} días` : null;
  const sinTitulares = viviendasConTitular === 0;
  const valido = form.titulo.trim() && opciones.length >= MIN_OPCIONES && !repetidas && !errorCierre && !errorQuorum && !sinTitulares;

  const cerrar = () => { setForm(inicial()); onClose(); };
  const cambiarTipo = (tipo) => setForm({ ...form, tipo, opciones: OPCIONES[tipo] });
  const cambiarOpcion = (i, texto) => setForm({ ...form, opciones: form.opciones.map((o, j) => (j === i ? texto : o)) });

  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.crearVotacion({
      tipo: form.tipo, titulo: form.titulo.trim(), descripcion: form.descripcion.trim() || null, fecha_cierre: form.fecha_cierre,
      quorum: form.tipo === 'Votación' ? quorum : null,
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
        <TextField
          required label="Pregunta o título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value.slice(0, MAX_TITULO) })}
          slotProps={{ htmlInput: { maxLength: MAX_TITULO } }}
        />
        <TextField
          label="Detalle" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value.slice(0, MAX_DETALLE) })} multiline minRows={2}
          helperText="Costos, plazos o lo que los vecinos necesiten saber para votar." slotProps={{ htmlInput: { maxLength: MAX_DETALLE } }}
        />

        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" component="h3">Opciones</Typography>
          {form.opciones.map((o, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" fullWidth label={`Opción ${i + 1}`} value={o} onChange={(e) => cambiarOpcion(i, e.target.value.slice(0, MAX_OPCION))} slotProps={{ htmlInput: { maxLength: MAX_OPCION } }} />
              <Tooltip title="Quitar opción">
                <span>
                  <IconButton aria-label={`Quitar opción ${i + 1}`} disabled={form.opciones.length <= MIN_OPCIONES} onClick={() => setForm({ ...form, opciones: form.opciones.filter((_, j) => j !== i) })}>
                    <QuitarIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
          {repetidas && <Typography variant="body2" color="error">Hay opciones repetidas.</Typography>}
          <Button startIcon={<AddIcon />} onClick={() => setForm({ ...form, opciones: [...form.opciones, ''] })} sx={{ justifySelf: 'start' }} disabled={form.opciones.length >= MAX_OPCIONES}>
            Agregar opción
          </Button>
        </Box>

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            required label="Cierra el" type="date" value={form.fecha_cierre} onChange={(e) => setForm({ ...form, fecha_cierre: e.target.value })}
            error={Boolean(errorCierre)} helperText={errorCierre ?? `Hasta ${MAX_DIAS_ABIERTA} días desde hoy`}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: enDias(1), max: enDias(MAX_DIAS_ABIERTA) } }}
          />
          {form.tipo === 'Votación' && (
            <TextField
              required label="Quórum mínimo" type="number" value={form.quorum} onChange={(e) => setForm({ ...form, quorum: e.target.value })}
              error={Boolean(errorQuorum)}
              helperText={errorQuorum ?? `${Math.ceil((quorum / 100) * totalUnidades) || 0} de ${totalUnidades} unidades`}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { min: 1, max: 100, step: 1 } }}
            />
          )}
        </Box>
        {sinTitulares ? (
          <Alert severity="warning" variant="outlined">
            Ninguna vivienda tiene un titular con acceso a la app, así que nadie podría votar. Administración debe asignar titulares en Unidades antes de abrir la votación.
          </Alert>
        ) : (
          <Alert severity="info" variant="outlined">
            Se avisará por la app y por correo a los titulares de {viviendasConTitular} {viviendasConTitular === 1 ? 'vivienda' : 'viviendas'}
            {viviendasConTitular < totalUnidades ? ` (${totalUnidades - viviendasConTitular} sin titular no podrán votar)` : ''}.
            Cada vivienda vota una vez, a través de su titular, y las opciones no se pueden cambiar después.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Abrir y avisar</Button>
      </DialogActions>
    </Dialog>
  );
}

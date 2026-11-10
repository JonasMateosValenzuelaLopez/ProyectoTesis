import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment,
  TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon } from '@mui/icons-material';
import { useAviso } from '../../context/AvisoContext';
import * as votacionesApi from '../../api/votaciones';
import {
  MAX_DETALLE, MAX_DIAS_ABIERTA, MAX_OPCION, MAX_OPCIONES, MAX_TITULO, MIN_OPCIONES, fechaEnDias as enDias,
} from '../../utils/votaciones';

const OPCIONES = { Votación: ['A favor', 'En contra', 'Abstención'], Encuesta: ['', ''] };

// Abrir una votación (con quórum, para decisiones) o una encuesta (consulta sin quórum) con POST votaciones.
// Las opciones no se pueden cambiar una vez abierta, porque ya pueden existir votos.
// Mismas reglas que la API: cierre después de hoy y hasta 90 días, quórum entero de 1 a 100,
// y el aviso llega solo a los titulares (si ninguna vivienda tiene titular, la API no deja abrirla).
// `unidades` (GET unidades) sirve para contar las viviendas y cuántas tienen titular. El padre lo monta al abrirlo.
export default function DialogoVotacion({ unidades, onClose, onCreada }) {
  const { avisar } = useAviso();
  const [form, setForm] = useState({ tipo: 'Votación', titulo: '', descripcion: '', opciones: OPCIONES['Votación'], fechaCierre: enDias(7), quorum: '50' });
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const totalUnidades = unidades.length;
  const conTitular = unidades.filter((u) => u.ocupantes.some((o) => o.titular)).length;
  const opciones = form.opciones.map((o) => o.trim()).filter(Boolean);
  const repetidas = new Set(opciones.map((o) => o.toLowerCase())).size !== opciones.length;
  const quorum = Number(form.quorum);
  const errorQuorum = form.tipo === 'Votación' && !(Number.isInteger(quorum) && quorum >= 1 && quorum <= 100) ? 'Debe ser un porcentaje entre 1 y 100' : null;
  const errorCierre = !form.fechaCierre || form.fechaCierre <= enDias(0) ? 'Debe ser posterior a hoy'
    : form.fechaCierre > enDias(MAX_DIAS_ABIERTA) ? `Puede estar abierta hasta ${MAX_DIAS_ABIERTA} días` : null;
  const valido = form.titulo.trim() && opciones.length >= MIN_OPCIONES && !repetidas && !errorCierre && !errorQuorum;

  const cambiarTipo = (tipo) => setForm({ ...form, tipo, opciones: OPCIONES[tipo] });
  const cambiarOpcion = (i, texto) => setForm({ ...form, opciones: form.opciones.map((o, j) => (j === i ? texto : o)) });

  const guardar = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      await votacionesApi.crearVotacion({
        tipo: form.tipo, titulo: form.titulo.trim(), ...(form.descripcion.trim() ? { descripcion: form.descripcion.trim() } : {}),
        opciones, fechaCierre: form.fechaCierre, ...(form.tipo === 'Votación' ? { quorum } : {}),
      });
      avisar(`${form.tipo} abierta. Se avisó por correo a los titulares.`);
      onCreada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
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
        <TextField required label="Pregunta o título" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} slotProps={{ htmlInput: { maxLength: MAX_TITULO } }} />
        <TextField
          label="Detalle" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} multiline minRows={2}
          helperText="Costos, plazos o lo que los vecinos necesiten saber para votar." slotProps={{ htmlInput: { maxLength: MAX_DETALLE } }}
        />

        <Box sx={{ display: 'grid', gap: 1 }}>
          <Typography variant="subtitle2" component="h3">Opciones</Typography>
          {form.opciones.map((o, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" fullWidth label={`Opción ${i + 1}`} value={o} onChange={(e) => cambiarOpcion(i, e.target.value)} slotProps={{ htmlInput: { maxLength: MAX_OPCION } }} />
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
            required label="Cierra el" type="date" value={form.fechaCierre} onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
            error={Boolean(errorCierre)} helperText={errorCierre ?? `Hasta ${MAX_DIAS_ABIERTA} días desde hoy`}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: enDias(1), max: enDias(MAX_DIAS_ABIERTA) } }}
          />
          {form.tipo === 'Votación' && (
            <TextField
              required label="Quórum mínimo" value={form.quorum} onChange={(e) => setForm({ ...form, quorum: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              error={Boolean(errorQuorum)}
              helperText={errorQuorum ?? `${Math.ceil((quorum / 100) * totalUnidades) || 0} de ${totalUnidades} unidades`}
              slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> }, htmlInput: { inputMode: 'numeric' } }}
            />
          )}
        </Box>
        {conTitular === 0 ? (
          <Alert severity="warning" variant="outlined">
            Ninguna vivienda tiene un titular, así que nadie podría votar. Administración debe asignar titulares en Unidades antes de abrir la votación.
          </Alert>
        ) : (
          <Alert severity="info" variant="outlined">
            Se avisará por correo a los titulares de {conTitular} {conTitular === 1 ? 'vivienda' : 'viviendas'}
            {conTitular < totalUnidades ? ` (${totalUnidades - conTitular} sin titular no podrán votar)` : ''}.
            Cada vivienda vota una vez, a través de su titular, y las opciones no se pueden cambiar después.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido || conTitular === 0} loading={enviando}>Abrir y avisar</Button>
      </DialogActions>
    </Dialog>
  );
}

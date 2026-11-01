import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon } from '@mui/icons-material';
import { useDirectiva } from '../../context/DirectivaContext';
import { lineas } from '../../utils/formato';

const TIPOS_ACTA = ['Reunión de directiva', 'Asamblea ordinaria', 'Asamblea extraordinaria'];

const acuerdoVacio = { texto: '', responsable: '', plazo: '' };

function desdeActa(acta) {
  if (!acta) return { tipo: TIPOS_ACTA[0], fecha: new Date().toISOString().slice(0, 10), lugar: '', unidades_presentes: '', asistentes: '', temas: '', acuerdos: [acuerdoVacio] };
  return {
    tipo: acta.tipo, fecha: acta.fecha, lugar: acta.lugar ?? '',
    unidades_presentes: acta.unidades_presentes ?? '',
    asistentes: acta.asistentes ?? '',
    temas: acta.temas ?? '',
    acuerdos: acta.acuerdos.length ? acta.acuerdos.map((a) => ({ texto: a.texto, responsable: a.responsable ?? '', plazo: a.plazo ?? '' })) : [acuerdoVacio],
  };
}

// Redactar o editar un acta. Se guarda como borrador; publicarla es un paso aparte.
// El padre lo monta con una `key` distinta por acta para que el formulario parta limpio.
export default function DialogoActa({ open, acta, onClose }) {
  const { totalUnidades, acciones } = useDirectiva();
  const [form, setForm] = useState(() => desdeActa(acta));
  const esAsamblea = form.tipo.startsWith('Asamblea');
  const valido = form.fecha && form.lugar.trim() && lineas(form.temas).length > 0;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const cambiarAcuerdo = (i, campo, valor) => setForm({ ...form, acuerdos: form.acuerdos.map((a, j) => (j === i ? { ...a, [campo]: valor } : a)) });

  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    // Fila de `actas` (asistentes y temas, uno por línea) y sus filas de `acta_acuerdos`
    acciones.guardarActa({
      ...(acta ? { id_acta: acta.id_acta } : {}),
      tipo: form.tipo, fecha: form.fecha, lugar: form.lugar.trim(),
      unidades_presentes: esAsamblea && form.unidades_presentes !== '' ? Number(form.unidades_presentes) : null,
      asistentes: lineas(form.asistentes).join('\n') || null,
      temas: lineas(form.temas).join('\n'),
    }, form.acuerdos.filter((a) => a.texto.trim()).map((a) => ({ texto: a.texto.trim(), responsable: a.responsable.trim() || null, plazo: a.plazo || null })));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" component="form" onSubmit={guardar}>
      <DialogTitle>{acta ? `Editar acta N° ${acta.numero}` : 'Nueva acta'}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1.4fr 1fr 1fr' } }}>
          <TextField select label="Tipo de reunión" name="tipo" value={form.tipo} onChange={cambiar}>
            {TIPOS_ACTA.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField required label="Fecha" name="fecha" type="date" value={form.fecha} onChange={cambiar} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField required label="Lugar" name="lugar" value={form.lugar} onChange={cambiar} placeholder="Ej: Sede social" />
        </Box>
        {esAsamblea && (
          <TextField
            label="Unidades presentes" name="unidades_presentes" type="number" value={form.unidades_presentes} onChange={cambiar}
            helperText={`De ${totalUnidades} unidades. Sirve para dejar constancia del quórum.`}
            slotProps={{ htmlInput: { min: 0, max: totalUnidades } }} sx={{ maxWidth: 280 }}
          />
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField label="Asistentes" name="asistentes" value={form.asistentes} onChange={cambiar} multiline minRows={4} helperText="Uno por línea" />
          <TextField required label="Temas tratados" name="temas" value={form.temas} onChange={cambiar} multiline minRows={4} helperText="Uno por línea" />
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="subtitle2" component="h3">Acuerdos</Typography>
          {form.acuerdos.map((a, i) => (
            <Box key={i} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 150px auto' }, alignItems: 'start' }}>
              <TextField size="small" label={`Acuerdo ${i + 1}`} value={a.texto} onChange={(e) => cambiarAcuerdo(i, 'texto', e.target.value)} />
              <TextField size="small" label="Responsable" value={a.responsable} onChange={(e) => cambiarAcuerdo(i, 'responsable', e.target.value)} />
              <TextField size="small" label="Plazo" type="date" value={a.plazo} onChange={(e) => cambiarAcuerdo(i, 'plazo', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Tooltip title="Quitar acuerdo">
                <span>
                  <IconButton aria-label={`Quitar acuerdo ${i + 1}`} disabled={form.acuerdos.length === 1} onClick={() => setForm({ ...form, acuerdos: form.acuerdos.filter((_, j) => j !== i) })}>
                    <QuitarIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={() => setForm({ ...form, acuerdos: [...form.acuerdos, acuerdoVacio] })} sx={{ justifySelf: 'start' }}>
            Agregar acuerdo
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Guardar borrador</Button>
      </DialogActions>
    </Dialog>
  );
}

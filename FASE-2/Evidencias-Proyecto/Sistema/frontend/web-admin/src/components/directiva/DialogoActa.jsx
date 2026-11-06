import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as QuitarIcon } from '@mui/icons-material';
import { useDirectiva } from '../../context/DirectivaContext';
import { lineas } from '../../utils/formato';
import {
  MAX_ACUERDO, MAX_ACUERDOS, MAX_LUGAR, MAX_RESPONSABLE, MAX_TEXTO_ACTA, fechaEnDias,
} from '../../utils/votaciones';

// Recorta un texto al largo que acepta la API
const hasta = (max) => (e) => e.target.value.slice(0, max);

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
// Mismas reglas que la API: la fecha no puede ser futura, las unidades presentes (solo en asambleas)
// no superan el total de la comunidad, hasta 30 acuerdos y los largos máximos de cada texto.
export default function DialogoActa({ open, acta, onClose }) {
  const { totalUnidades, acciones } = useDirectiva();
  const [form, setForm] = useState(() => desdeActa(acta));
  const esAsamblea = form.tipo.startsWith('Asamblea');
  const hoy = fechaEnDias(0);
  const errorFecha = form.fecha > hoy ? 'No puede ser una fecha futura' : null;
  const presentes = form.unidades_presentes === '' ? null : Number(form.unidades_presentes);
  const errorPresentes = esAsamblea && presentes !== null && !(Number.isInteger(presentes) && presentes >= 0 && presentes <= totalUnidades)
    ? `Entre 0 y ${totalUnidades} unidades` : null;
  const valido = form.fecha && !errorFecha && form.lugar.trim() && lineas(form.temas).length > 0 && !errorPresentes;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const cambiarTexto = (max) => (e) => setForm({ ...form, [e.target.name]: hasta(max)(e) });
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
          <TextField
            required label="Fecha" name="fecha" type="date" value={form.fecha} onChange={cambiar}
            error={Boolean(errorFecha)} helperText={errorFecha ?? ' '} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy } }}
          />
          <TextField required label="Lugar" name="lugar" value={form.lugar} onChange={cambiarTexto(MAX_LUGAR)} placeholder="Ej: Sede social" helperText=" " slotProps={{ htmlInput: { maxLength: MAX_LUGAR } }} />
        </Box>
        {esAsamblea && (
          <TextField
            label="Unidades presentes" name="unidades_presentes" type="number" value={form.unidades_presentes} onChange={cambiar}
            error={Boolean(errorPresentes)}
            helperText={errorPresentes ?? `De ${totalUnidades} unidades. Sirve para dejar constancia del quórum.`}
            slotProps={{ htmlInput: { min: 0, max: totalUnidades, step: 1 } }} sx={{ maxWidth: 280 }}
          />
        )}
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField label="Asistentes" name="asistentes" value={form.asistentes} onChange={cambiarTexto(MAX_TEXTO_ACTA)} multiline minRows={4} helperText="Uno por línea" slotProps={{ htmlInput: { maxLength: MAX_TEXTO_ACTA } }} />
          <TextField required label="Temas tratados" name="temas" value={form.temas} onChange={cambiarTexto(MAX_TEXTO_ACTA)} multiline minRows={4} helperText="Uno por línea" slotProps={{ htmlInput: { maxLength: MAX_TEXTO_ACTA } }} />
        </Box>

        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Typography variant="subtitle2" component="h3">Acuerdos</Typography>
          {form.acuerdos.map((a, i) => (
            <Box key={i} sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr 150px auto' }, alignItems: 'start' }}>
              <TextField size="small" label={`Acuerdo ${i + 1}`} value={a.texto} onChange={(e) => cambiarAcuerdo(i, 'texto', hasta(MAX_ACUERDO)(e))} slotProps={{ htmlInput: { maxLength: MAX_ACUERDO } }} />
              <TextField size="small" label="Responsable" value={a.responsable} onChange={(e) => cambiarAcuerdo(i, 'responsable', hasta(MAX_RESPONSABLE)(e))} slotProps={{ htmlInput: { maxLength: MAX_RESPONSABLE } }} />
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
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button startIcon={<AddIcon />} onClick={() => setForm({ ...form, acuerdos: [...form.acuerdos, acuerdoVacio] })} disabled={form.acuerdos.length >= MAX_ACUERDOS}>
              Agregar acuerdo
            </Button>
            {form.acuerdos.length >= MAX_ACUERDOS && <Typography variant="body2" color="text.secondary">Un acta puede tener hasta {MAX_ACUERDOS} acuerdos.</Typography>}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Guardar borrador</Button>
      </DialogActions>
    </Dialog>
  );
}

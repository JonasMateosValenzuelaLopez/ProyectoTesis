import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  InputAdornment, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { useSesion } from '../../context/SesionContext';
import { clp } from '../../utils/formato';

const vacio = { id_categoria: '', concepto: '', monto: '', fecha_vencimiento: '2026-11-05', es_extraordinario: false };

// Crear un cobro envía el correo automáticamente; el formulario lo dice antes de guardar.
export default function DialogoNuevoCobro({ open, onClose }) {
  const { comunidad } = useSesion();
  const { datos, acciones } = useFinanzas();
  const [form, setForm] = useState(vacio);
  const categorias = datos.categorias_cobro.filter((c) => c.activa);
  const unidades = comunidad.unidades.length;
  const monto = Number(form.monto) || 0;
  const valido = form.id_categoria && form.concepto.trim() && monto > 0 && form.fecha_vencimiento;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const cerrar = () => { setForm(vacio); onClose(); };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.crearCobro({
      id_categoria: form.id_categoria, concepto: form.concepto.trim(), monto_por_unidad: monto,
      fecha_emision: new Date().toISOString().slice(0, 10), fecha_vencimiento: form.fecha_vencimiento, es_extraordinario: form.es_extraordinario ? 1 : 0,
    });
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Nuevo cobro</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select required label="Categoría" name="id_categoria" value={form.id_categoria} onChange={cambiar}>
          {categorias.map((c) => <MenuItem key={c.id_categoria} value={c.id_categoria}>{c.nombre}</MenuItem>)}
        </TextField>
        <TextField required label="Concepto" name="concepto" value={form.concepto} onChange={cambiar} placeholder="Ej: Gasto común noviembre" />
        <TextField
          required label="Monto por unidad" name="monto" type="number" value={form.monto} onChange={cambiar}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 1, step: 1 } }}
        />
        <TextField required label="Vence el" name="fecha_vencimiento" type="date" value={form.fecha_vencimiento} onChange={cambiar} slotProps={{ inputLabel: { shrink: true } }} />
        <FormControlLabel
          control={<Switch checked={form.es_extraordinario} onChange={(e) => setForm({ ...form, es_extraordinario: e.target.checked })} />}
          label="Cobro extraordinario"
        />
        {monto > 0 && (
          <Typography color="text.secondary">
            Total a recaudar: <b>{clp(monto * unidades)}</b> ({unidades} unidades × {clp(monto)})
          </Typography>
        )}
        <Alert severity="info" variant="outlined">
          Al guardar se enviará un correo a las {unidades} unidades con el monto y la categoría.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Crear y enviar correo</Button>
      </DialogActions>
    </Dialog>
  );
}

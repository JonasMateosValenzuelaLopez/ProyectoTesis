import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  InputAdornment, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { useSesion } from '../../context/SesionContext';
import { clp } from '../../utils/formato';

const vacio = { idCategoria: '', concepto: '', monto: '', vencimiento: '2026-11-05', extraordinario: false };

// Crear un cobro envía el correo automáticamente; el formulario lo dice antes de guardar.
export default function DialogoNuevoCobro({ open, onClose }) {
  const { comunidad } = useSesion();
  const { datos, acciones } = useFinanzas();
  const [form, setForm] = useState(vacio);
  const categorias = datos.categorias.filter((c) => c.activa);
  const unidades = comunidad.unidades.length;
  const monto = Number(form.monto) || 0;
  const valido = form.idCategoria && form.concepto.trim() && monto > 0 && form.vencimiento;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const cerrar = () => { setForm(vacio); onClose(); };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.crearCobro({
      idCategoria: form.idCategoria, concepto: form.concepto.trim(), montoPorUnidad: monto,
      emision: new Date().toISOString().slice(0, 10), vencimiento: form.vencimiento, extraordinario: form.extraordinario,
    });
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Nuevo cobro</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select required label="Categoría" name="idCategoria" value={form.idCategoria} onChange={cambiar}>
          {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
        </TextField>
        <TextField required label="Concepto" name="concepto" value={form.concepto} onChange={cambiar} placeholder="Ej: Gasto común noviembre" />
        <TextField
          required label="Monto por unidad" name="monto" type="number" value={form.monto} onChange={cambiar}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { min: 1, step: 100 } }}
        />
        <TextField required label="Vence el" name="vencimiento" type="date" value={form.vencimiento} onChange={cambiar} slotProps={{ inputLabel: { shrink: true } }} />
        <FormControlLabel
          control={<Switch checked={form.extraordinario} onChange={(e) => setForm({ ...form, extraordinario: e.target.checked })} />}
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

import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  InputAdornment, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { clp } from '../../utils/formato';
import { errorMonto, hoyISO, MAX_CONCEPTO, MAX_DESCRIPCION_COBRO, soloDigitos } from '../../utils/finanzas';

// Nuevo cobro (POST finanzas/cobros): se crea una fila por cada unidad de la comunidad y se envía un correo
// a sus residentes. El periodo y la fecha de emisión los pone el backend (hoy). El vencimiento no puede ser pasado.
// El padre lo monta solo cuando está abierto, para que el formulario parta limpio.
export default function DialogoNuevoCobro({ categorias, totalUnidades, onClose, onCreado }) {
  const { avisar } = useAviso();
  const [form, setForm] = useState({ idCategoria: '', concepto: '', descripcion: '', monto: '', fechaVencimiento: '', extraordinario: false });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const hoy = hoyISO();
  const monto = Number(form.monto) || 0;

  const errores = {
    idCategoria: !form.idCategoria && 'Elige una categoría',
    concepto: !form.concepto.trim() && 'El concepto es obligatorio',
    monto: errorMonto(form.monto),
    fechaVencimiento: !form.fechaVencimiento ? 'Elige la fecha de vencimiento' : form.fechaVencimiento < hoy && 'El vencimiento no puede ser una fecha pasada',
  };
  const err = (k) => (intento ? errores[k] || null : null);
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (Object.values(errores).some(Boolean)) return;
    setEnviando(true);
    setError(null);
    try {
      const cobro = await finanzas.crearCobro({
        idCategoria: Number(form.idCategoria),
        concepto: form.concepto.trim(),
        ...(form.descripcion.trim() ? { descripcion: form.descripcion.trim() } : {}),
        montoPorUnidad: monto,
        fechaVencimiento: form.fechaVencimiento,
        extraordinario: form.extraordinario,
      });
      avisar(`Cobro creado para ${cobro.totales.unidades} unidades. Se enviará un correo a ${cobro.correos} ${cobro.correos === 1 ? 'persona' : 'personas'}.`);
      onCreado(cobro);
      onClose();
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar} noValidate>
      <DialogTitle>Nuevo cobro</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {categorias.length === 0 && <Alert severity="warning">No hay categorías activas. Crea una en «Categorías de cobro».</Alert>}
        <TextField select required label="Categoría" name="idCategoria" value={form.idCategoria} onChange={cambiar} error={!!err('idCategoria')} helperText={err('idCategoria') || ' '}>
          {categorias.map((c) => <MenuItem key={c.idCategoria} value={c.idCategoria}>{c.nombre}</MenuItem>)}
        </TextField>
        <TextField
          required label="Concepto" name="concepto" value={form.concepto} onChange={cambiar} placeholder="Ej: Gasto común noviembre"
          error={!!err('concepto')} helperText={err('concepto') || ' '} slotProps={{ htmlInput: { maxLength: MAX_CONCEPTO } }}
        />
        <TextField
          label="Detalle (opcional)" name="descripcion" value={form.descripcion} onChange={cambiar} multiline minRows={2}
          slotProps={{ htmlInput: { maxLength: MAX_DESCRIPCION_COBRO } }} helperText="Los residentes lo verán en la app."
        />
        <TextField
          required label="Monto por unidad" value={form.monto} onChange={(e) => setForm({ ...form, monto: soloDigitos(e.target.value) })}
          error={!!err('monto')} helperText={err('monto') || (monto ? clp(monto) : ' ')}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
        />
        <TextField
          required label="Vence el" name="fechaVencimiento" type="date" value={form.fechaVencimiento} onChange={cambiar}
          error={!!err('fechaVencimiento')} helperText={err('fechaVencimiento') || ' '}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: hoy } }}
        />
        <FormControlLabel
          control={<Switch checked={form.extraordinario} onChange={(e) => setForm({ ...form, extraordinario: e.target.checked })} />}
          label="Cobro extraordinario"
        />
        {monto > 0 && totalUnidades > 0 && (
          <Typography color="text.secondary">
            Total a recaudar: <b>{clp(monto * totalUnidades)}</b> ({totalUnidades} unidades × {clp(monto)})
          </Typography>
        )}
        <Alert severity="info" variant="outlined">
          Al guardar se cobra a las {totalUnidades} unidades y se envía un correo a sus residentes con el monto y el vencimiento.
        </Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando} disabled={categorias.length === 0}>Crear y enviar correo</Button>
      </DialogActions>
    </Dialog>
  );
}

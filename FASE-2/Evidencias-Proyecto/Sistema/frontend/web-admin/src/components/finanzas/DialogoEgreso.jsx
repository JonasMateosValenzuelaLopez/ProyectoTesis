import { useState } from 'react';
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, TextField,
} from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { clp } from '../../utils/formato';
import { errorMonto, hoyISO, MAX_DESCRIPCION_EGRESO, MAX_PROVEEDOR, soloDigitos } from '../../utils/finanzas';

const urlValida = (texto) => /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(texto);

// Registrar un egreso (POST finanzas/egresos). Si el monto llega al umbral de visado de la comunidad,
// queda esperando la decisión de la Presidencia; si no, cuenta de inmediato en los reportes.
// La fecha no puede ser futura y el comprobante, si se indica, es un enlace https.
// El padre lo monta solo cuando está abierto.
export default function DialogoEgreso({ categorias, umbralVisado, onClose, onRegistrado }) {
  const { avisar } = useAviso();
  const hoy = hoyISO();
  const [form, setForm] = useState({ idCategoria: '', monto: '', descripcion: '', proveedor: '', fechaEgreso: hoy, comprobanteUrl: '' });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const monto = Number(form.monto) || 0;
  const conVisado = umbralVisado != null && monto >= umbralVisado;

  const errores = {
    idCategoria: !form.idCategoria && 'Elige una categoría',
    monto: errorMonto(form.monto),
    descripcion: !form.descripcion.trim() && 'Describe el gasto',
    fechaEgreso: !form.fechaEgreso ? 'Elige la fecha' : form.fechaEgreso > hoy && 'La fecha no puede ser futura',
    comprobanteUrl: form.comprobanteUrl.trim() && !urlValida(form.comprobanteUrl.trim()) && 'Debe ser un enlace que empiece con https://',
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
      const egreso = await finanzas.registrarEgreso({
        idCategoria: Number(form.idCategoria),
        monto,
        descripcion: form.descripcion.trim(),
        ...(form.proveedor.trim() ? { proveedor: form.proveedor.trim() } : {}),
        fechaEgreso: form.fechaEgreso,
        ...(form.comprobanteUrl.trim() ? { comprobanteUrl: form.comprobanteUrl.trim() } : {}),
      });
      avisar(egreso.requiereVisado ? 'Egreso registrado. Queda esperando el visado de la Presidencia.' : 'Egreso registrado.');
      onRegistrado(egreso);
      onClose();
    } catch (er) {
      setError(er.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar} noValidate>
      <DialogTitle>Registrar egreso</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {categorias.length === 0 && <Alert severity="warning">No hay categorías activas. Tesorería las crea en «Categorías de cobro».</Alert>}
        <TextField select required label="Categoría" name="idCategoria" value={form.idCategoria} onChange={cambiar} error={!!err('idCategoria')} helperText={err('idCategoria') || ' '}>
          {categorias.map((c) => <MenuItem key={c.idCategoria} value={c.idCategoria}>{c.nombre}</MenuItem>)}
        </TextField>
        <TextField
          required label="Descripción" name="descripcion" value={form.descripcion} onChange={cambiar} placeholder="Ej: Mantención de bombas de agua"
          error={!!err('descripcion')} helperText={err('descripcion') || ' '} slotProps={{ htmlInput: { maxLength: MAX_DESCRIPCION_EGRESO } }}
        />
        <TextField
          required label="Monto" value={form.monto} onChange={(e) => setForm({ ...form, monto: soloDigitos(e.target.value) })}
          error={!!err('monto')} helperText={err('monto') || (monto ? clp(monto) : ' ')}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> }, htmlInput: { inputMode: 'numeric', maxLength: 8 } }}
        />
        <TextField label="Proveedor (opcional)" name="proveedor" value={form.proveedor} onChange={cambiar} slotProps={{ htmlInput: { maxLength: MAX_PROVEEDOR } }} />
        <TextField
          required label="Fecha del gasto" name="fechaEgreso" type="date" value={form.fechaEgreso} onChange={cambiar}
          error={!!err('fechaEgreso')} helperText={err('fechaEgreso') || ' '}
          slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: hoy } }}
        />
        <TextField
          label="Enlace al comprobante (opcional)" name="comprobanteUrl" value={form.comprobanteUrl} onChange={cambiar} placeholder="https://"
          error={!!err('comprobanteUrl')} helperText={err('comprobanteUrl') || 'Por ejemplo, la boleta o factura guardada en Drive.'}
          slotProps={{ htmlInput: { maxLength: 255, inputMode: 'url' } }}
        />
        {conVisado && (
          <Alert severity="info" variant="outlined">
            Desde {clp(umbralVisado)} el gasto necesita el visado de la Presidencia. No contará en los reportes hasta que lo vise.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando} disabled={categorias.length === 0}>Registrar</Button>
      </DialogActions>
    </Dialog>
  );
}

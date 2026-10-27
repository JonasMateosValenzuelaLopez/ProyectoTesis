import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { useSesion } from '../../context/SesionContext';
import { residentes } from '../../data/finanzasMock';
import { clp, nombreUnidad } from '../../utils/formato';

const vacio = { idUnidad: '', idCobro: '', motivo: '' };

// El Tesorero solicita; la exención no se aplica hasta que el Presidente la aprueba.
export default function DialogoExencion({ open, onClose }) {
  const { comunidad } = useSesion();
  const { datos, cobrosDelPeriodo, acciones } = useFinanzas();
  const [form, setForm] = useState(vacio);
  const cobrosPendientes = cobrosDelPeriodo.filter((c) => datos.cobroUnidades[c.id]?.[form.idUnidad]?.estado === 'pendiente');
  const valido = form.idUnidad && form.idCobro && form.motivo.trim().length >= 10;
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value, ...(e.target.name === 'idUnidad' ? { idCobro: '' } : {}) });
  const cerrar = () => { setForm(vacio); onClose(); };
  const enviar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.solicitarExencion({ idUnidad: form.idUnidad, idCobro: form.idCobro, motivo: form.motivo.trim() });
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={enviar}>
      <DialogTitle>Solicitar exención</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select required label="Unidad" name="idUnidad" value={form.idUnidad} onChange={cambiar}>
          {comunidad.unidades.map((u) => <MenuItem key={u.id} value={u.id}>{nombreUnidad(u)}{residentes[u.id] ? ` · ${residentes[u.id]}` : ''}</MenuItem>)}
        </TextField>
        <TextField
          select required label="Cobro" name="idCobro" value={form.idCobro} onChange={cambiar} disabled={!form.idUnidad}
          helperText={form.idUnidad && cobrosPendientes.length === 0 ? 'Esta unidad no tiene cobros pendientes este mes.' : ' '}
        >
          {cobrosPendientes.map((c) => <MenuItem key={c.id} value={c.id}>{c.concepto} · {clp(c.montoPorUnidad)}</MenuItem>)}
        </TextField>
        <TextField required multiline minRows={3} label="Motivo" name="motivo" value={form.motivo} onChange={cambiar} helperText="Mínimo 10 caracteres. Presidencia lo verá al revisar." />
        <Alert severity="info" variant="outlined">La exención se aplica solo cuando el Presidente la aprueba. Mientras tanto, el cobro sigue vigente.</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Enviar a Presidencia</Button>
      </DialogActions>
    </Dialog>
  );
}

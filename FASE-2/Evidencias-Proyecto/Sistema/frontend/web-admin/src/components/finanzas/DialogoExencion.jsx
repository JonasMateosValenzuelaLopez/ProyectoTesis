import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { useSesion } from '../../context/SesionContext';
import { residentes } from '../../data/finanzasMock';
import { clp, nombreUnidad } from '../../utils/formato';

const vacio = { id_unidad: '', id_gasto: '', motivo: '' };

// El Tesorero solicita; la exención no se aplica hasta que el Presidente la aprueba.
export default function DialogoExencion({ open, onClose }) {
  const { comunidad } = useSesion();
  const { periodo, gastosPorUnidad, cobroPorId, acciones } = useFinanzas();
  const [form, setForm] = useState(vacio);
  // Gastos del mes que la unidad aún debe (una fila de `gastos_comunes` por cobro)
  const gastosPendientes = (gastosPorUnidad[form.id_unidad] ?? [])
    .filter((g) => g.mes === periodo.mes && g.anio === periodo.anio && g.estado_pago === 'Pendiente');
  const valido = form.id_unidad && form.id_gasto && form.motivo.trim().length >= 10;
  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value, ...(e.target.name === 'id_unidad' ? { id_gasto: '' } : {}) });
  const cerrar = () => { setForm(vacio); onClose(); };
  const enviar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.solicitarExencion({ id_gasto: form.id_gasto, motivo: form.motivo.trim() });
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={enviar}>
      <DialogTitle>Solicitar exención</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select required label="Unidad" name="id_unidad" value={form.id_unidad} onChange={cambiar}>
          {comunidad.unidades.map((u) => <MenuItem key={u.id_unidad} value={u.id_unidad}>{nombreUnidad(u)}{residentes[u.id_unidad] ? ` · ${residentes[u.id_unidad]}` : ''}</MenuItem>)}
        </TextField>
        <TextField
          select required label="Cobro" name="id_gasto" value={form.id_gasto} onChange={cambiar} disabled={!form.id_unidad}
          helperText={form.id_unidad && gastosPendientes.length === 0 ? 'Esta unidad no tiene cobros pendientes este mes.' : ' '}
        >
          {gastosPendientes.map((g) => <MenuItem key={g.id_gasto} value={g.id_gasto}>{cobroPorId[g.id_cobro]?.concepto ?? g.descripcion} · {clp(g.monto_total)}</MenuItem>)}
        </TextField>
        <TextField required multiline minRows={3} label="Motivo" name="motivo" value={form.motivo} onChange={cambiar} helperText="Mínimo 10 caracteres. Presidencia lo verá al revisar." />
        <Alert severity="info" variant="outlined">La exención se aplica solo cuando la Presidencia la aprueba. Mientras tanto, el cobro sigue vigente.</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Enviar a Presidencia</Button>
      </DialogActions>
    </Dialog>
  );
}

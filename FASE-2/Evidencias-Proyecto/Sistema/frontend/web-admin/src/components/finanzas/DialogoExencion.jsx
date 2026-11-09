import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { useConsulta } from '../../api/useConsulta';
import { clp, nombreUnidad } from '../../utils/formato';
import { MAX_MOTIVO, nombrePeriodo, residentesDe } from '../../utils/finanzas';

const EN_CURSO = ['Pendiente', 'Por aprobar'];

// Tesorería pide una exención (POST finanzas/exenciones): nace «Por aprobar» y la decide la Presidencia.
// Mientras tanto el cobro sigue vigente. Con `inicial` ({ idUnidad, idCobroUnidad }) llega con la unidad y el cobro elegidos.
// El padre lo monta solo cuando está abierto, para que el formulario parta limpio.
export default function DialogoExencion({ unidades, inicial, onClose, onSolicitada }) {
  const { avisar } = useAviso();
  const [idUnidad, setIdUnidad] = useState(inicial?.idUnidad ?? '');
  const [idCobroUnidad, setIdCobroUnidad] = useState(inicial?.idCobroUnidad ?? '');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const cuenta = useConsulta(() => (idUnidad ? finanzas.detalleUnidad(idUnidad) : Promise.resolve(null)), [idUnidad]);
  // Cobros que se pueden eximir: pendientes y sin otra exención en revisión
  const cobros = (cuenta.datos?.cobros ?? []).filter((c) => c.estado === 'Pendiente' && !(c.exencion && EN_CURSO.includes(c.exencion.estado)));
  const valido = idUnidad && idCobroUnidad && motivo.trim();

  const enviar = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    setError(null);
    try {
      await finanzas.solicitarExencion(Number(idCobroUnidad), motivo.trim());
      avisar('Exención enviada a la Presidencia. El cobro sigue vigente hasta que la apruebe.');
      onSolicitada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={enviar}>
      <DialogTitle>Pedir exención</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select required label="Unidad" value={idUnidad} onChange={(e) => { setIdUnidad(e.target.value); setIdCobroUnidad(''); }}>
          {unidades.map((u) => (
            <MenuItem key={u.idUnidad} value={u.idUnidad}>{nombreUnidad(u)}{residentesDe(u) ? ` · ${residentesDe(u)}` : ''}</MenuItem>
          ))}
        </TextField>
        <TextField
          select required label="Cobro" value={cobros.some((c) => c.idCobroUnidad === Number(idCobroUnidad)) ? idCobroUnidad : ''}
          onChange={(e) => setIdCobroUnidad(e.target.value)} disabled={!idUnidad || cuenta.cargando}
          error={!!cuenta.error}
          helperText={cuenta.error?.message ?? (idUnidad && !cuenta.cargando && cobros.length === 0 ? 'Esta unidad no tiene cobros pendientes que se puedan eximir.' : ' ')}
        >
          {cobros.map((c) => (
            <MenuItem key={c.idCobroUnidad} value={c.idCobroUnidad}>{c.concepto} · {nombrePeriodo(c.periodo)} · {clp(c.monto)}</MenuItem>
          ))}
        </TextField>
        <TextField
          required multiline minRows={3} label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}
          slotProps={{ htmlInput: { maxLength: MAX_MOTIVO } }} helperText={`La Presidencia lo verá al decidir. ${motivo.length}/${MAX_MOTIVO}`}
        />
        <Alert severity="info" variant="outlined">La exención se aplica solo cuando la Presidencia la aprueba. Mientras tanto, el cobro sigue vigente.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido} loading={enviando}>Enviar a Presidencia</Button>
      </DialogActions>
    </Dialog>
  );
}

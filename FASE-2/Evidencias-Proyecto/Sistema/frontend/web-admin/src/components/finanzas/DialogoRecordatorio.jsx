import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as finanzas from '../../api/finanzas';
import { clp, fechaHora } from '../../utils/formato';

// Un solo botón envía el recordatorio a todas las unidades con cobros vencidos (POST finanzas/recordatorios).
// Cada correo indica solo la deuda de esa unidad. `estado` es la respuesta de GET finanzas/estado.
export default function DialogoRecordatorio({ estado, onClose, onEnviado }) {
  const { avisar } = useAviso();
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const unidades = estado.morosos.length;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await finanzas.enviarRecordatorio();
      avisar(`Recordatorio enviado: ${r.destinatarios} ${r.destinatarios === 1 ? 'persona' : 'personas'} de ${r.unidades} ${r.unidades === 1 ? 'unidad' : 'unidades'}.`);
      onEnviado();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Recordar a morosos</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography>
          Se enviará un correo a los residentes de las <b>{unidades} {unidades === 1 ? 'unidad' : 'unidades'}</b> con cobros vencidos, por un total de <b>{clp(estado.resumen.deudaMorosa)}</b>.
          Cada correo indica solo la deuda de esa unidad.
        </Typography>
        {estado.ultimoRecordatorio && (
          <Alert severity="warning" variant="outlined">
            El último recordatorio se envió el {fechaHora(estado.ultimoRecordatorio.fecha)} a {estado.ultimoRecordatorio.destinatarios} personas.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={enviar} loading={enviando} disabled={unidades === 0}>Enviar a {unidades} {unidades === 1 ? 'unidad' : 'unidades'}</Button>
      </DialogActions>
    </Dialog>
  );
}

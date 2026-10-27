import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { useFinanzas } from '../../context/FinanzasContext';
import { clp, fechaHora } from '../../utils/formato';

// Un solo botón envía el recordatorio a todas las unidades con deuda a la vez.
export default function DialogoRecordatorio({ open, onClose }) {
  const { morosos, resumen, ultimoRecordatorio, acciones } = useFinanzas();
  const enviar = () => { acciones.enviarRecordatorio(); onClose(); };
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Recordar a morosos</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography>
          Se enviará un correo a las <b>{morosos.length} unidades</b> con deuda pendiente, por un total de <b>{clp(resumen.deudaMorosa)}</b>. Cada correo indica solo la deuda de esa unidad.
        </Typography>
        {ultimoRecordatorio && (
          <Alert severity="warning" variant="outlined">
            El último recordatorio se envió el {fechaHora(ultimoRecordatorio.fecha_envio)}.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={enviar} disabled={morosos.length === 0}>Enviar a {morosos.length} unidades</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import { MAX_MOTIVO } from '../../utils/finanzas';

// Confirmar una decisión con comentario opcional (DecidirDto del backend: { aprobado, comentario? }).
// `decision` = { titulo, detalle, aprobado, etiqueta, mensaje, hacer(comentario) }. El padre lo monta solo cuando hay una decisión.
export default function DialogoDecision({ decision, onClose, onHecho }) {
  const { avisar } = useAviso();
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      await decision.hacer(comentario.trim());
      avisar(decision.mensaje);
      onHecho();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{decision.titulo}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography>{decision.detalle}</Typography>
        <TextField
          autoFocus multiline minRows={2} label="Comentario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)}
          slotProps={{ htmlInput: { maxLength: MAX_MOTIVO } }} helperText="Queda registrado en la bitácora."
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color={decision.aprobado ? 'primary' : 'error'} loading={enviando} onClick={confirmar}>{decision.etiqueta}</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { nombreUnidad } from '../../utils/formato';

const vacio = { categoria: 'delivery', persona: '', idUnidad: '', patente: '' };

// Ingreso sin invitación: delivery, proveedores o visitas que el residente autorizó por teléfono.
export default function DialogoIngreso({ onClose }) {
  const { comunidad } = useSesion();
  const { acciones } = useConserjeria();
  const [f, setF] = useState(vacio);
  const valido = f.persona.trim() && f.idUnidad;
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.ingresoSinInvitacion({ categoria: f.categoria, persona: f.persona.trim(), idUnidad: f.idUnidad, patente: f.patente.trim().toUpperCase() });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Ingreso sin invitación</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <ToggleButtonGroup exclusive fullWidth value={f.categoria} onChange={(_, v) => v && setF({ ...f, categoria: v })}>
          <ToggleButton value="delivery">Delivery</ToggleButton>
          <ToggleButton value="proveedor">Proveedor</ToggleButton>
          <ToggleButton value="visita">Visita</ToggleButton>
        </ToggleButtonGroup>
        <TextField required autoFocus label={f.categoria === 'delivery' ? 'Empresa o nombre' : 'Nombre'} value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField select required label="Va a" value={f.idUnidad} onChange={(e) => setF({ ...f, idUnidad: e.target.value })}>
            {comunidad.unidades.map((u) => <MenuItem key={u.id} value={u.id}>{nombreUnidad(u)}</MenuItem>)}
          </TextField>
          <TextField label="Patente (opcional)" value={f.patente} onChange={(e) => setF({ ...f, patente: e.target.value })} slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
        </Box>
        {f.categoria === 'visita' && <Alert severity="warning" variant="outlined">Confirma por teléfono con el residente antes de dejar pasar a una visita sin invitación.</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Registrar ingreso</Button>
      </DialogActions>
    </Dialog>
  );
}

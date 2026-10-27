import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { nombreUnidad } from '../../utils/formato';

const vacio = { categoria: 'Delivery', persona: '', id_unidad: '', patente: '' };

// Ingreso sin invitación: delivery, proveedores o visitas. Nadie pasa hasta que el residente
// lo autoriza en la app, o la garita lo confirma con él por WhatsApp o llamada.
export default function DialogoIngreso({ onClose }) {
  const { comunidad } = useSesion();
  const { acciones } = useConserjeria();
  const [f, setF] = useState(vacio);
  const valido = f.persona.trim() && f.id_unidad;
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.ingresoSinInvitacion({ categoria: f.categoria, persona: f.persona.trim(), id_unidad: f.id_unidad, patente: f.patente.trim().toUpperCase() });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Ingreso sin invitación</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <ToggleButtonGroup exclusive fullWidth value={f.categoria} onChange={(_, v) => v && setF({ ...f, categoria: v })}>
          <ToggleButton value="Delivery">Delivery</ToggleButton>
          <ToggleButton value="Proveedor">Proveedor</ToggleButton>
          <ToggleButton value="Visita">Visita</ToggleButton>
        </ToggleButtonGroup>
        <TextField required autoFocus label={f.categoria === 'Visita' ? 'Nombre y apellido' : 'Empresa o nombre'} value={f.persona} onChange={(e) => setF({ ...f, persona: e.target.value })} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField select required label="Va a" value={f.id_unidad} onChange={(e) => setF({ ...f, id_unidad: e.target.value })}>
            {comunidad.unidades.map((u) => <MenuItem key={u.id_unidad} value={u.id_unidad}>{nombreUnidad(u)}</MenuItem>)}
          </TextField>
          <TextField label="Patente (opcional)" value={f.patente} onChange={(e) => setF({ ...f, patente: e.target.value })} slotProps={{ htmlInput: { style: { textTransform: 'uppercase' } } }} />
        </Box>
        <Alert severity="info" variant="outlined">
          {f.id_unidad ? `Avisaremos a ${residentes[f.id_unidad] ?? 'el residente'} en la app para que autorice el ingreso.` : 'Avisaremos al residente en la app para que autorice el ingreso.'}
          {' '}Si no responde, puedes escribirle por WhatsApp o llamarle desde la garita.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Avisar al residente</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import * as porteria from '../../api/porteria';
import { nombreUnidad } from '../../utils/formato';
import { formatearRut, rutValido } from '../../utils/rut';
import { MAX_NOMBRE_VISITA, errorVisita, normalizarPatente } from '../../utils/porteria';

// Ingreso sin invitación (POST porteria/accesos): delivery, proveedores, servicios o visitas. Nadie pasa hasta
// que el residente lo autoriza en la app, o la garita lo confirma con él por WhatsApp o llamada.
// `inicial` permite registrar de nuevo una solicitud que expiró. El padre lo monta al abrirlo.
export default function DialogoIngreso({ unidades, inicial, onClose, onRegistrado }) {
  const { avisar } = useAviso();
  const [f, setF] = useState({
    categoria: inicial?.categoria ?? 'Delivery', nombre: inicial?.visitante ?? '', rut: '',
    idUnidad: inicial?.unidad?.idUnidad ?? '', patente: inicial?.patente ?? '',
  });
  const [intento, setIntento] = useState(false);
  const [errorApi, setErrorApi] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // Como la API: nombre de 2 a 100 caracteres, RUT válido si se indica y patente de 4 a 8 letras o números
  const error = errorVisita(f) ?? (f.rut.trim() && !rutValido(f.rut) ? { rut: 'El RUT no es válido' } : null);
  const unidad = unidades.find((u) => u.idUnidad === f.idUnidad);
  const residentes = unidad?.ocupantes.map((o) => o.nombre).join(', ');

  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!f.nombre.trim() || !f.idUnidad || error) return;
    setEnviando(true);
    setErrorApi(null);
    try {
      const patente = normalizarPatente(f.patente);
      await porteria.ingresoSinInvitacion({
        nombre: f.nombre.trim().replace(/\s+/g, ' '), categoria: f.categoria, idUnidad: f.idUnidad,
        ...(f.rut.trim() ? { rut: formatearRut(f.rut) } : {}), ...(patente ? { patente } : {}),
      });
      avisar(`Avisamos a ${nombreUnidad(unidad)} en la app. Espera su respuesta.`);
      onRegistrado();
      onClose();
    } catch (err) {
      setErrorApi(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Ingreso sin invitación</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <ToggleButtonGroup exclusive fullWidth value={f.categoria} onChange={(_, v) => v && setF({ ...f, categoria: v })}>
          <ToggleButton value="Delivery">Delivery</ToggleButton>
          <ToggleButton value="Proveedor">Proveedor</ToggleButton>
          <ToggleButton value="Servicio">Servicio</ToggleButton>
          <ToggleButton value="Visita">Visita</ToggleButton>
        </ToggleButtonGroup>
        <TextField
          required autoFocus label={f.categoria === 'Visita' ? 'Nombre y apellido' : 'Empresa o nombre'} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })}
          error={intento && !!error?.nombre} helperText={intento && error?.nombre} slotProps={{ htmlInput: { maxLength: MAX_NOMBRE_VISITA } }}
        />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField select required label="Va a" value={f.idUnidad} onChange={(e) => setF({ ...f, idUnidad: e.target.value })} error={intento && !f.idUnidad} helperText={intento && !f.idUnidad ? 'Indica la vivienda que visita' : ' '}>
            {unidades.map((u) => <MenuItem key={u.idUnidad} value={u.idUnidad}>{nombreUnidad(u)}</MenuItem>)}
          </TextField>
          <TextField
            label="Patente (opcional)" value={f.patente} onChange={(e) => setF({ ...f, patente: e.target.value })}
            error={intento && !!error?.patente} helperText={(intento && error?.patente) || ' '} slotProps={{ htmlInput: { maxLength: 10, style: { textTransform: 'uppercase' } } }}
          />
        </Box>
        <TextField
          label="RUT (opcional)" value={f.rut} onChange={(e) => setF({ ...f, rut: e.target.value })} onBlur={() => rutValido(f.rut) && setF({ ...f, rut: formatearRut(f.rut) })}
          error={intento && !!error?.rut} helperText={(intento && error?.rut) || ' '} sx={{ maxWidth: { sm: '50%' } }}
        />
        <Alert severity="info" variant="outlined">
          {unidad ? `Avisaremos a ${residentes || nombreUnidad(unidad)} en la app para que autorice el ingreso.` : 'Avisaremos al residente en la app para que autorice el ingreso.'}
          {' '}Si no responde, puedes escribirle por WhatsApp o llamarle desde la garita. La solicitud expira a los 30 minutos.
        </Alert>
        {errorApi && <Alert severity="error">{errorApi}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando}>Avisar al residente</Button>
      </DialogActions>
    </Dialog>
  );
}

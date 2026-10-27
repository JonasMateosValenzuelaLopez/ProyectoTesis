import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { nombreUnidad } from '../../utils/formato';
import { formatearRut, rutValido } from '../../utils/rut';

const vacio = { nombre: '', rut: '', correo: '', telefono: '', idUnidad: '', relacion: 'propietario' };

// Alta de un residente por invitación: le llega un correo para crear su clave o entrar con código.
export default function DialogoInvitar({ open, onClose }) {
  const { comunidad } = useSesion();
  const { usuarios, acciones } = useAdmin();
  const [form, setForm] = useState(vacio);
  const rutMal = form.rut.length > 3 && !rutValido(form.rut);
  const rutRepetido = rutValido(form.rut) && usuarios.some((u) => u.rut === formatearRut(form.rut));
  const correoMal = form.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.correo);
  const valido = form.nombre.trim() && rutValido(form.rut) && !rutRepetido && form.correo && !correoMal && form.idUnidad;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const cerrar = () => { setForm(vacio); onClose(); };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.invitar({
      nombre: form.nombre.trim(), rut: formatearRut(form.rut), correo: form.correo.trim(), telefono: form.telefono.trim(),
      residencias: [{ idUnidad: form.idUnidad, relacion: form.relacion }],
    });
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Invitar residente</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField required label="Nombre completo" name="nombre" value={form.nombre} onChange={cambiar} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            required label="RUT" name="rut" value={form.rut} onChange={cambiar} onBlur={() => rutValido(form.rut) && setForm({ ...form, rut: formatearRut(form.rut) })}
            error={rutMal || rutRepetido} helperText={rutMal ? 'RUT no válido' : rutRepetido ? 'Ya existe una persona con este RUT' : 'Con dígito verificador'} placeholder="12.345.678-9"
          />
          <TextField label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="+56 9 1234 5678" />
        </Box>
        <TextField required label="Correo" name="correo" type="email" value={form.correo} onChange={cambiar} error={Boolean(correoMal)} helperText={correoMal ? 'Revisa el correo' : ' '} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField select required label="Unidad" name="idUnidad" value={form.idUnidad} onChange={cambiar}>
            {comunidad.unidades.map((u) => <MenuItem key={u.id} value={u.id}>{nombreUnidad(u)}</MenuItem>)}
          </TextField>
          <TextField select label="Relación con la unidad" name="relacion" value={form.relacion} onChange={cambiar}>
            <MenuItem value="propietario">Propietario</MenuItem>
            <MenuItem value="arrendatario">Arrendatario</MenuItem>
          </TextField>
        </Box>
        <Alert severity="info" variant="outlined">Le llegará un correo para entrar a la app con su RUT y una clave o un código.</Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" disabled={!valido}>Enviar invitación</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { nombreUnidad } from '../../utils/formato';
import { formatearRut, rutValido } from '../../utils/rut';

const vacio = { nombre: '', apellido_paterno: '', apellido_materno: '', rut: '', correo: '', telefono: '', id_unidad: '', relacion: 'Propietario' };
// Teléfono como lo guarda la base: +56 y los dígitos, sin espacios
const normalizarTelefono = (t) => {
  const d = t.replace(/\D/g, '');
  if (!d) return null;
  return `+${d.startsWith('56') ? d : `56${d}`}`;
};

// Alta de un residente por invitación: le llega un correo para crear su clave o entrar con código.
export default function DialogoInvitar({ open, onClose }) {
  const { comunidad } = useSesion();
  const { usuarios, acciones } = useAdmin();
  const [form, setForm] = useState(vacio);
  const rutMal = form.rut.length > 3 && !rutValido(form.rut);
  const rutRepetido = rutValido(form.rut) && usuarios.some((u) => u.rut === formatearRut(form.rut));
  const correoMal = form.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.correo);
  const valido = form.nombre.trim() && form.apellido_paterno.trim() && rutValido(form.rut) && !rutRepetido && form.correo && !correoMal && form.id_unidad;

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const cerrar = () => { setForm(vacio); onClose(); };
  const guardar = (e) => {
    e.preventDefault();
    if (!valido) return;
    acciones.invitar({
      nombre: form.nombre.trim(), apellido_paterno: form.apellido_paterno.trim(), apellido_materno: form.apellido_materno.trim() || null,
      rut: formatearRut(form.rut), correo: form.correo.trim(), telefono: normalizarTelefono(form.telefono),
      residencias: [{ id_unidad: form.id_unidad, relacion: form.relacion }],
    });
    cerrar();
  };

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={guardar}>
      <DialogTitle>Invitar residente</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField required label="Nombres" name="nombre" value={form.nombre} onChange={cambiar} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField required label="Apellido paterno" name="apellido_paterno" value={form.apellido_paterno} onChange={cambiar} />
          <TextField label="Apellido materno" name="apellido_materno" value={form.apellido_materno} onChange={cambiar} helperText="Opcional" />
        </Box>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            required label="RUT" name="rut" value={form.rut} onChange={cambiar} onBlur={() => rutValido(form.rut) && setForm({ ...form, rut: formatearRut(form.rut) })}
            error={rutMal || rutRepetido} helperText={rutMal ? 'RUT no válido' : rutRepetido ? 'Ya existe una persona con este RUT' : 'Con dígito verificador'} placeholder="12.345.678-9"
          />
          <TextField label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="+56 9 1234 5678" />
        </Box>
        <TextField required label="Correo" name="correo" type="email" value={form.correo} onChange={cambiar} error={Boolean(correoMal)} helperText={correoMal ? 'Revisa el correo' : ' '} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField select required label="Unidad" name="id_unidad" value={form.id_unidad} onChange={cambiar}>
            {comunidad.unidades.map((u) => <MenuItem key={u.id_unidad} value={u.id_unidad}>{nombreUnidad(u)}</MenuItem>)}
          </TextField>
          <TextField select label="Relación con la unidad" name="relacion" value={form.relacion} onChange={cambiar}>
            <MenuItem value="Propietario">Propietario</MenuItem>
            <MenuItem value="Arrendatario">Arrendatario</MenuItem>
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

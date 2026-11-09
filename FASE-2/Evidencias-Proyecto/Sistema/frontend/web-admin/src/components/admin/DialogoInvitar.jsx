import { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import { useAviso } from '../../context/AvisoContext';
import { invitarResidente } from '../../api/admin';
import { nombreUnidad, normalizarTelefono } from '../../utils/formato';
import { formatearRut, rutValido } from '../../utils/rut';

// Campos con los nombres del backend (InvitarResidenteDto)
const vacio = { nombre: '', primerApellido: '', segundoApellido: '', identificador: '', correo: '', telefono: '', idUnidad: '', tipoResidencia: 'Propietario' };

// POST residentes: invita a una persona a una unidad. Si ya tiene cuenta en EntreCasas, se le suma esta
// comunidad; si es nueva, le llega un correo para crear su clave. Devuelve la persona y `correoEnviado`.
export default function DialogoInvitar({ open, unidades, onClose, onInvitada }) {
  const { avisar } = useAviso();
  const [form, setForm] = useState(vacio);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const rutMal = form.identificador.length > 3 && !rutValido(form.identificador);
  const correoMal = form.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.correo.trim());
  const telefonoNuevo = form.telefono.trim() ? normalizarTelefono(form.telefono) : null;
  const telefonoMal = !!form.telefono.trim() && !telefonoNuevo;
  const valido = form.nombre.trim() && form.primerApellido.trim() && rutValido(form.identificador) && form.correo.trim() && !correoMal && !telefonoMal && form.idUnidad;

  const cambiar = (e) => { setForm({ ...form, [e.target.name]: e.target.value }); setError(null); };
  const cerrar = () => { setForm(vacio); setIntento(false); setError(null); onClose(); };
  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!valido) return;
    setEnviando(true);
    try {
      const persona = await invitarResidente({
        identificador: formatearRut(form.identificador),
        nombre: form.nombre.trim(),
        primerApellido: form.primerApellido.trim(),
        ...(form.segundoApellido.trim() ? { segundoApellido: form.segundoApellido.trim() } : {}),
        correo: form.correo.trim().toLowerCase(),
        ...(telefonoNuevo ? { telefono: telefonoNuevo } : {}),
        idUnidad: form.idUnidad,
        tipoResidencia: form.tipoResidencia,
      });
      avisar(persona.correoEnviado
        ? `Invitamos a ${persona.nombre}. Le llegó un correo para entrar.`
        : `Invitamos a ${persona.nombre}, pero el correo no se pudo enviar. Reenvíalo desde su ficha.`);
      onInvitada(persona);
      cerrar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  const marcar = (malo) => intento && !!malo;

  return (
    <Dialog open={open} onClose={cerrar} fullWidth maxWidth="sm" component="form" onSubmit={guardar} noValidate>
      <DialogTitle>Invitar residente</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField required label="Nombre" name="nombre" value={form.nombre} onChange={cambiar} error={marcar(!form.nombre.trim())} slotProps={{ htmlInput: { maxLength: 50 } }} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField required label="Primer apellido" name="primerApellido" value={form.primerApellido} onChange={cambiar} error={marcar(!form.primerApellido.trim())} slotProps={{ htmlInput: { maxLength: 50 } }} />
          <TextField label="Segundo apellido" name="segundoApellido" value={form.segundoApellido} onChange={cambiar} helperText="Opcional" slotProps={{ htmlInput: { maxLength: 50 } }} />
        </Box>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField
            required label="RUT" name="identificador" value={form.identificador} onChange={cambiar}
            onBlur={() => rutValido(form.identificador) && setForm({ ...form, identificador: formatearRut(form.identificador) })}
            error={rutMal || marcar(!rutValido(form.identificador))} helperText={rutMal || marcar(!rutValido(form.identificador)) ? 'RUT no válido' : 'Con dígito verificador'} placeholder="12.345.678-5"
          />
          <TextField label="Teléfono" name="telefono" type="tel" value={form.telefono} onChange={cambiar} placeholder="+56 9 1234 5678"
            error={telefonoMal} helperText={telefonoMal ? 'Escribe un celular de 9 dígitos' : 'Opcional'} />
        </Box>
        <TextField required label="Correo" name="correo" type="email" value={form.correo} onChange={cambiar}
          error={Boolean(correoMal) || marcar(!form.correo.trim())} helperText={correoMal ? 'Revisa el correo' : ' '} slotProps={{ htmlInput: { maxLength: 100 } }} />
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <TextField select required label="Unidad" name="idUnidad" value={form.idUnidad} onChange={cambiar} error={marcar(!form.idUnidad)}
            helperText={unidades.length ? ' ' : 'Primero crea las unidades'}>
            {unidades.map((u) => <MenuItem key={u.idUnidad} value={u.idUnidad}>{nombreUnidad(u)}{u.callePasaje ? ` · ${u.callePasaje}` : ''}</MenuItem>)}
          </TextField>
          <TextField select label="Relación con la unidad" name="tipoResidencia" value={form.tipoResidencia} onChange={cambiar}>
            <MenuItem value="Propietario">Propietario</MenuItem>
            <MenuItem value="Arrendatario">Arrendatario</MenuItem>
          </TextField>
        </Box>
        <Alert severity="info" variant="outlined">Si es nueva en EntreCasas, le llegará un correo para crear su clave (válido por 3 días). Si ya tiene cuenta, entra con la que usa.</Alert>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cerrar}>Cancelar</Button>
        <Button type="submit" variant="contained" loading={enviando}>Enviar invitación</Button>
      </DialogActions>
    </Dialog>
  );
}

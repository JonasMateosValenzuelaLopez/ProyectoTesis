import { useState } from 'react';
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, TextField, Typography, Link as MuiLink } from '@mui/material';
import { AVISO_SOLICITUD, TEXTO_CONSENTIMIENTO } from '../../config/privacidad';
import { ArrowBack as VolverIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { comunidadesParaSolicitar, crearSolicitud } from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { formatearRut, rutValido } from '../../utils/rut';
import { normalizarTelefono } from '../../utils/formato';
import PanelMarca from '../../components/marca/PanelMarca';
import SelectorTema from '../../components/SelectorTema';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

// Campos con los nombres del backend (CrearSolicitudAccesoDto)
const vacio = { idRed: '', identificador: '', nombre: '', primerApellido: '', segundoApellido: '', correo: '', telefono: '', numeroUnidad: '', tipoResidencia: 'Propietario', mensaje: '' };

// Mismo armazón que Entrar: panel de marca a la izquierda y el formulario a la derecha.
// POST solicitudes-acceso (público): la administración de la comunidad la aprueba o rechaza en Residentes y cargos.
export default function SolicitarAcceso() {
  const { datos: comunidades, error: errorComunidades } = useConsulta(comunidadesParaSolicitar);
  const [f, setF] = useState(vacio);
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [enviada, setEnviada] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [acepta, setAcepta] = useState(false);

  const cambiar = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setError(null); };
  const rutMal = f.identificador.length > 3 && !rutValido(f.identificador);
  const correoMal = f.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(f.correo.trim());
  const telefono = f.telefono.trim() ? normalizarTelefono(f.telefono) : null;
  const telefonoMal = !!f.telefono.trim() && !telefono;
  // La casilla de consentimiento es obligatoria. El backend todavía no la recibe ni la guarda, así que no se envía.
  const valido = acepta && f.idRed && rutValido(f.identificador) && f.nombre.trim() && f.primerApellido.trim() && f.correo.trim() && !correoMal && !telefonoMal && f.numeroUnidad.trim();
  const marcar = (malo) => intento && !!malo;

  const enviar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!valido) return;
    setEnviando(true);
    try {
      const r = await crearSolicitud({
        idRed: Number(f.idRed),
        identificador: formatearRut(f.identificador),
        nombre: f.nombre.trim(),
        primerApellido: f.primerApellido.trim(),
        ...(f.segundoApellido.trim() ? { segundoApellido: f.segundoApellido.trim() } : {}),
        correo: f.correo.trim().toLowerCase(),
        ...(telefono ? { telefono } : {}),
        numeroUnidad: f.numeroUnidad.trim(),
        tipoResidencia: f.tipoResidencia,
        ...(f.mensaje.trim() ? { mensaje: f.mensaje.trim() } : {}),
      });
      setEnviada(r.mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca titulo="Únete a EntreCasas." texto="Conecta con tus vecinos y participa en tu comunidad. La administración valida tu vivienda antes de activar la cuenta." />
      <SelectorTema flotante />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 460, display: 'grid', gap: 3 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
            <PlacaUnidad tipo="" numero="EC" size="sm" />
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="h1">Solicitar acceso</Typography>
            <Typography color="text.secondary">Ingresa tus datos. La administración validará tu residencia para activar tu cuenta.</Typography>
          </Box>

          {enviada ? <Alert severity="success" variant="outlined">{enviada}</Alert> : (
            <Box component="form" onSubmit={enviar} noValidate sx={{ display: 'grid', gap: 2 }}>
              <TextField select required label="Comunidad" name="idRed" value={f.idRed} onChange={cambiar} error={marcar(!f.idRed) || !!errorComunidades}
                helperText={errorComunidades ? errorComunidades.message : ' '}>
                {(comunidades ?? []).map((c) => <MenuItem key={c.idRed} value={c.idRed}>{c.nombre} · {c.tipo}</MenuItem>)}
              </TextField>
              <TextField required label="RUT" name="identificador" value={f.identificador} placeholder="12.345.678-5" autoComplete="username" onChange={cambiar}
                onBlur={() => rutValido(f.identificador) && setF({ ...f, identificador: formatearRut(f.identificador) })}
                error={rutMal || marcar(!rutValido(f.identificador))} helperText={rutMal || marcar(!rutValido(f.identificador)) ? 'RUT no válido' : ' '} />
              <TextField required label="Nombre" name="nombre" value={f.nombre} autoComplete="given-name" onChange={cambiar} error={marcar(!f.nombre.trim())} slotProps={{ htmlInput: { maxLength: 50 } }} />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField required label="Primer apellido" name="primerApellido" value={f.primerApellido} onChange={cambiar} error={marcar(!f.primerApellido.trim())} slotProps={{ htmlInput: { maxLength: 50 } }} />
                <TextField label="Segundo apellido" name="segundoApellido" value={f.segundoApellido} onChange={cambiar} helperText="Opcional" slotProps={{ htmlInput: { maxLength: 50 } }} />
              </Box>
              <TextField required label="Correo electrónico" name="correo" type="email" value={f.correo} autoComplete="email" onChange={cambiar}
                error={Boolean(correoMal) || marcar(!f.correo.trim())} helperText={correoMal ? 'Revisa el correo' : ' '} slotProps={{ htmlInput: { maxLength: 100 } }} />
              <TextField label="Teléfono (opcional)" name="telefono" type="tel" value={f.telefono} onChange={cambiar} placeholder="+56 9 1234 5678"
                error={telefonoMal} helperText={telefonoMal ? 'Escribe un celular de 9 dígitos' : ' '} />
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
                <TextField required label="Número de casa o depto" name="numeroUnidad" value={f.numeroUnidad} onChange={cambiar} placeholder="12 o 304"
                  error={marcar(!f.numeroUnidad.trim())} slotProps={{ htmlInput: { maxLength: 20 } }} />
                <TextField select label="Eres" name="tipoResidencia" value={f.tipoResidencia} onChange={cambiar}>
                  <MenuItem value="Propietario">Propietario</MenuItem>
                  <MenuItem value="Arrendatario">Arrendatario</MenuItem>
                </TextField>
              </Box>
              <TextField label="Mensaje para la administración (opcional)" name="mensaje" value={f.mensaje} onChange={cambiar} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 255 } }} />
              {/* Ley 21.719: antes de enviar, qué datos se piden y para qué, y el consentimiento explícito */}
              <Box sx={{ display: 'grid', gap: 1, p: 1.5, borderRadius: 1.5, border: 1, borderColor: marcar(!acepta) ? 'error.main' : 'divider', bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary">
                  {AVISO_SOLICITUD}{' '}
                  <MuiLink component={RouterLink} to="/privacidad" target="_blank" rel="noopener">Lee la Política de privacidad</MuiLink>.
                </Typography>
                <FormControlLabel
                  control={<Checkbox checked={acepta} onChange={(e) => { setAcepta(e.target.checked); setError(null); }} required />}
                  label={<Typography variant="body2">{TEXTO_CONSENTIMIENTO}</Typography>}
                  sx={{ alignItems: 'flex-start', m: 0, '& .MuiCheckbox-root': { pt: 0.25, pl: 0 } }}
                />
                {marcar(!acepta) && <Typography variant="body2" color="error">Para enviar la solicitud debes aceptar el tratamiento de tus datos.</Typography>}
              </Box>
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" loading={enviando} sx={{ mt: 1 }}>Enviar solicitud</Button>
            </Box>
          )}

          <MuiLink component={RouterLink} to="/login" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, justifySelf: 'start' }}>
            <VolverIcon fontSize="small" /> Volver a Entrar
          </MuiLink>
        </Box>
      </Box>
    </Box>
  );
}

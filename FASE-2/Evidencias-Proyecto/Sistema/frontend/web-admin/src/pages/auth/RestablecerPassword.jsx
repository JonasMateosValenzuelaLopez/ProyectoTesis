import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, TextField, Typography, Link as MuiLink } from '@mui/material';
import { ArrowBack as VolverIcon } from '@mui/icons-material';
import * as auth from '../../api/auth';
import { errorClaveNueva } from '../../utils/clave';
import PanelMarca from '../../components/marca/PanelMarca';
import SelectorTema from '../../components/SelectorTema';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

// Llega desde el correo (FRONTEND_URL/restablecer-password?token=…). El mismo enlace sirve para
// recuperar la clave y para crear la primera clave de una cuenta invitada. El token tiene 43 caracteres.
export default function RestablecerPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const enlaceValido = /^[\w-]{43}$/.test(token);
  const [f, setF] = useState({ nueva: '', repetir: '' });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const errorNueva = errorClaveNueva(f.nueva);
  const errorRepetir = f.repetir !== f.nueva ? 'Las claves no coinciden' : '';
  const cambiar = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setError(null); };

  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (errorNueva || errorRepetir) return;
    setEnviando(true);
    try {
      setListo((await auth.restablecerPassword(token, f.nueva)).mensaje);
    } catch (err) {
      setError(err.campos?.password ?? err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca titulo="Tu clave de EntreCasas" texto="Crea una clave para entrar al panel y a la app con tu RUT." />
      <SelectorTema flotante />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 420, display: 'grid', gap: 3 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
            <PlacaUnidad tipo="" numero="EC" size="sm" />
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="h1">Crear una clave nueva</Typography>
            <Typography color="text.secondary">Al menos 8 caracteres, con una letra y un número.</Typography>
          </Box>

          {listo ? (
            <>
              <Alert severity="success" variant="outlined">{listo}</Alert>
              <Button variant="contained" size="large" onClick={() => navigate('/login', { replace: true })}>Ir a Entrar</Button>
            </>
          ) : !enlaceValido ? (
            <>
              <Alert severity="error">El enlace no es válido o ya expiró.</Alert>
              <Button variant="outlined" size="large" component={RouterLink} to="/recuperar-password">Pedir un enlace nuevo</Button>
            </>
          ) : (
            <Box component="form" onSubmit={guardar} noValidate sx={{ display: 'grid', gap: 2 }}>
              <TextField
                label="Clave nueva" type="password" name="nueva" value={f.nueva} onChange={cambiar} autoFocus autoComplete="new-password"
                error={intento && !!errorNueva} helperText={(intento && errorNueva) || ' '}
              />
              <TextField
                label="Repite la clave nueva" type="password" name="repetir" value={f.repetir} onChange={cambiar} autoComplete="new-password"
                error={intento && !!errorRepetir} helperText={(intento && errorRepetir) || ' '}
              />
              {error && (
                <Alert severity="error" action={<Button color="inherit" size="small" component={RouterLink} to="/recuperar-password">Pedir otro</Button>}>
                  {error}
                </Alert>
              )}
              <Button type="submit" variant="contained" size="large" loading={enviando} disabled={!f.nueva || !f.repetir}>Guardar clave</Button>
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

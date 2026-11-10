import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography, Link as MuiLink } from '@mui/material';
import { ArrowBack as VolverIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import * as auth from '../../api/auth';
import PanelMarca from '../../components/marca/PanelMarca';
import SelectorTema from '../../components/SelectorTema';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

// Mismo armazón que Entrar: panel de marca a la izquierda y el formulario a la derecha.
// POST auth/recuperar-password: siempre responde lo mismo, exista o no la cuenta.
export default function RecuperarPassword() {
  const [correo, setCorreo] = useState('');
  const [enviado, setEnviado] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    const c = correo.trim().toLowerCase();
    if (!correoValido(c)) { setError('Revisa el correo.'); return; }
    setError(null);
    setEnviando(true);
    try {
      setEnviado((await auth.recuperarPassword({ correo: c })).mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca titulo="¿Problemas para entrar?" texto="Recupera el acceso a tu cuenta de forma rápida y segura." />
      <SelectorTema flotante />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 420, display: 'grid', gap: 3 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
            <PlacaUnidad tipo="" numero="EC" size="sm" />
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="h1">Recuperar clave</Typography>
            <Typography color="text.secondary">Ingresa el correo registrado. Te enviaremos un enlace para crear una nueva clave.</Typography>
          </Box>

          {enviado ? (
            <Alert severity="success" variant="outlined">{enviado} Revisa también la carpeta de spam. El enlace sirve una sola vez.</Alert>
          ) : (
            <Box component="form" onSubmit={enviar} noValidate sx={{ display: 'grid', gap: 2 }}>
              <TextField
                required label="Correo electrónico" type="email" autoComplete="email" autoFocus value={correo}
                onChange={(e) => { setCorreo(e.target.value); setError(null); }}
              />
              {error && <Alert severity="error">{error}</Alert>}
              <Button type="submit" variant="contained" size="large" loading={enviando} disabled={!correo.trim()} sx={{ mt: 1 }}>Enviar enlace</Button>
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

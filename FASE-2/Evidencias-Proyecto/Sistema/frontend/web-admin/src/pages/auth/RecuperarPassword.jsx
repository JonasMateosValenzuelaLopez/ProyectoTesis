import { useState } from 'react';
import { Box, Button, TextField, Typography, Link as MuiLink } from '@mui/material';
import { ArrowBack as VolverIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import PanelMarca from '../../components/marca/PanelMarca';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

// Mismo armazón que Entrar: panel de marca a la izquierda y el formulario a la derecha.
export default function RecuperarPassword() {
  const [correo, setCorreo] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); console.log('Recuperar:', correo); };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca titulo="¿Problemas para entrar?" texto="Recupera el acceso a tu cuenta de forma rápida y segura." />

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

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField required label="Correo electrónico" type="email" autoComplete="email" autoFocus onChange={(e) => setCorreo(e.target.value)} />
            <Button type="submit" variant="contained" size="large" sx={{ mt: 1 }}>Enviar enlace</Button>
          </Box>

          <MuiLink component={RouterLink} to="/login" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, justifySelf: 'start' }}>
            <VolverIcon fontSize="small" /> Volver a Entrar
          </MuiLink>
        </Box>
      </Box>
    </Box>
  );
}

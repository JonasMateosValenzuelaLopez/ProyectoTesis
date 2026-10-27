import { useState } from 'react';
import { Box, Button, TextField, Typography, Link as MuiLink } from '@mui/material';
import { ArrowBack as VolverIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import PanelMarca from '../../components/marca/PanelMarca';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

// Mismo armazón que Entrar: panel de marca a la izquierda y el formulario a la derecha.
export default function SolicitarAcceso() {
  const [datos, setDatos] = useState({ rut: '', nombre: '', correo: '', unidad: '' });

  const handleChange = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); console.log('Solicitud:', datos); };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca titulo="Únete a EntreCasas." texto="Conecta con tus vecinos y participa en tu comunidad. La administración valida tu vivienda antes de activar la cuenta." />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 420, display: 'grid', gap: 3 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
            <PlacaUnidad tipo="" numero="EC" size="sm" />
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="h1">Solicitar acceso</Typography>
            <Typography color="text.secondary">Ingresa tus datos. La administración validará tu residencia para activar tu cuenta.</Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField required label="RUT" name="rut" placeholder="12.345.678-5" autoComplete="username" autoFocus onChange={handleChange} />
            <TextField required label="Nombre completo" name="nombre" autoComplete="name" onChange={handleChange} />
            <TextField required label="Correo electrónico" name="correo" type="email" autoComplete="email" onChange={handleChange} />
            <TextField required label="Número de casa o depto" name="unidad" placeholder="Casa 12 o Depto 304" onChange={handleChange} />
            <Button type="submit" variant="contained" size="large" sx={{ mt: 1 }}>Enviar solicitud</Button>
          </Box>

          <MuiLink component={RouterLink} to="/login" variant="body2" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, justifySelf: 'start' }}>
            <VolverIcon fontSize="small" /> Volver a Entrar
          </MuiLink>
        </Box>
      </Box>
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, Link as MuiLink, Fade, Slide } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function SolicitarAcceso() {
  const [datos, setDatos] = useState({ rut: '', nombre: '', correo: '', unidad: '' });
  const [animar, setAnimar] = useState(false);

  // Esto asegura que la animación se dispare al cargar el componente
  useEffect(() => {
    setAnimar(true);
  }, []);

  const handleChange = (e) => setDatos({ ...datos, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); console.log('Solicitud:', datos); };

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Lado Izquierdo: Imagen y Branding */}
      <Grid size={{ sm: 4, md: 7 }} sx={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1574362848149-11496d93a7c7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)',
          backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
          display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'primary.contrastText', p: 4,
          '&::before': { content: '""', position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(23, 39, 42, 0.88)', zIndex: 1 }
        }}>
        <Fade in={animar} timeout={1500}>
          <Box sx={{ zIndex: 2, textAlign: 'center', maxWidth: '80%' }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              Únete a EntreCasas
            </Typography>
            <Typography variant="h6" sx={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)', lineHeight: 1.5 }}>
              Conecta con tus vecinos y participa activamente en tu comunidad
            </Typography>
          </Box>
        </Fade>
      </Grid>

      {/* Lado Derecho: Formulario con animación desde abajo hacia arriba */}
      <Grid size={{ xs: 12, sm: 8, md: 5 }} component={Paper} elevation={10} square sx={{ display: 'flex', alignItems: 'center', overflowY: 'auto' }}>
        <Slide direction="up" in={animar} mountOnEnter unmountOnExit timeout={800}>
          <Box sx={{ my: 4, mx: { xs: 4, md: 8 }, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            
            <Typography component="h1" variant="h4" color="primary" fontWeight="bold" gutterBottom>
              Solicitar Acceso
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 4 }}>
              Ingresa tus datos. La administración validará tu residencia para activar tu cuenta.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField margin="normal" required fullWidth label="RUT" name="rut" autoFocus onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }} />
              <TextField margin="normal" required fullWidth label="Nombre Completo" name="nombre" onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }} />
              <TextField margin="normal" required fullWidth label="Correo Electrónico" name="correo" type="email" onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }} />
              <TextField margin="normal" required fullWidth label="Número de Casa/Depto" name="unidad" onChange={handleChange} sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }} />
              
              <Button type="submit" fullWidth variant="contained" color="primary" size="large" sx={{ mt: 4, mb: 3, py: 1.5, fontSize: '1.1rem', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: 'none' } }}>
                Enviar Solicitud
              </Button>

              <Box textAlign="center" sx={{ mt: 1 }}>
                <MuiLink component={RouterLink} to="/login" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', fontWeight: 'bold', '&:hover': { color: 'secondary.main' } }}>
                  ← Volver al inicio de sesión
                </MuiLink>
              </Box>
            </Box>
          </Box>
        </Slide>
      </Grid>
    </Grid>
  );
}
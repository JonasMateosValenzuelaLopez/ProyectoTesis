import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, Link as MuiLink, Fade, Slide } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function RecuperarPassword() {
  const [correo, setCorreo] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); console.log('Recuperar:', correo); };

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Lado Izquierdo: Branding */}
      <Grid item xs={false} sm={4} md={7} sx={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)',
          backgroundRepeat: 'no-repeat', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'primary.contrastText', p: 4,
          '&::before': { content: '""', position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(42, 157, 143, 0.85)', zIndex: 1 }
        }}>
        <Fade in={true} timeout={1500}>
          <Box sx={{ zIndex: 2, textAlign: 'center', maxWidth: '80%' }}>
            <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              ¿Problemas para entrar?
            </Typography>
            <Typography variant="h6" sx={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)', lineHeight: 1.5 }}>
              Recupera el acceso a tu cuenta de forma rápida y segura.
            </Typography>
          </Box>
        </Fade>
      </Grid>

      {/* Lado Derecho: Formulario */}
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={10} square sx={{ display: 'flex', alignItems: 'center' }}>
        <Slide direction="up" in={true} mountOnEnter unmountOnExit timeout={800}>
          <Box sx={{ my: 8, mx: { xs: 4, md: 8 }, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            
            <Typography component="h1" variant="h4" color="primary" fontWeight="bold" gutterBottom>
              Recuperar Contraseña
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
              Ingresa el correo registrado. Te enviaremos un enlace para crear una nueva clave.
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField 
                margin="normal" required fullWidth label="Correo Electrónico" type="email" autoFocus onChange={(e) => setCorreo(e.target.value)} 
                sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }} 
              />
              
              <Button type="submit" fullWidth variant="contained" color="secondary" size="large" sx={{ mt: 4, mb: 3, py: 1.5, fontSize: '1.1rem', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 20px rgba(244, 162, 97, 0.4)' } }}>
                Enviar Enlace
              </Button>

              <Box textAlign="center" sx={{ mt: 2 }}>
                <MuiLink component={RouterLink} to="/login" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', fontWeight: 'bold', '&:hover': { color: 'primary.main' } }}>
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
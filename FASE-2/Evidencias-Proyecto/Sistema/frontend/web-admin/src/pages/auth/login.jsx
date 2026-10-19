import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Paper, Grid, Link as MuiLink, Fade, Slide } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function Login() {
  const [credenciales, setCredenciales] = useState({ correo: '', password: '' });

  const handleChange = (e) => setCredenciales({ ...credenciales, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); console.log('Login:', credenciales); };

  return (
    <Grid container component="main" sx={{ height: '100vh', overflow: 'hidden' }}>
      
      {/* Lado Izquierdo: Imagen Fotográfica con Filtro de Color y Animación */}
      <Grid 
        item 
        xs={false} 
        sm={4} 
        md={7} 
        sx={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1460472178825-e5240623afd5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80)',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'primary.contrastText',
          p: 4,
          '&::before': { // Esta es la capa semitransparente Azul Cerceta
            content: '""',
            position: 'absolute',
            top: 0, right: 0, bottom: 0, left: 0,
            backgroundColor: 'rgba(42, 157, 143, 0.85)', // Tu color primario con 85% de opacidad
            zIndex: 1
          }
        }}
      >
        <Fade in={true} timeout={1500}>
          <Box sx={{ zIndex: 2, textAlign: 'center', maxWidth: '80%' }}>
            <Typography variant="h2" fontWeight="bold" gutterBottom sx={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
              EntreCasas
            </Typography>
            <Typography variant="h5" sx={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)', lineHeight: 1.5 }}>
              Democratizando la participación en tu comunidad
            </Typography>
          </Box>
        </Fade>
      </Grid>

      {/* Lado Derecho: Formulario funcional animado */}
      <Grid item xs={12} sm={8} md={5} component={Paper} elevation={10} square sx={{ display: 'flex', alignItems: 'center' }}>
        <Slide direction="up" in={true} mountOnEnter unmountOnExit timeout={800}>
          <Box sx={{ my: 8, mx: { xs: 4, md: 8 }, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            
            <Typography component="h1" variant="h4" color="primary" fontWeight="bold" gutterBottom>
              Bienvenido
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Ingresa tus credenciales para continuar
            </Typography>

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField 
                margin="normal" required fullWidth label="Correo Electrónico" name="correo" autoFocus 
                onChange={handleChange} 
                sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }}
              />
              <TextField 
                margin="normal" required fullWidth name="password" label="Contraseña" type="password" 
                onChange={handleChange} 
                sx={{ '& .MuiOutlinedInput-root': { transition: '0.3s', '&:hover': { boxShadow: '0 4px 10px rgba(0,0,0,0.05)' } } }}
              />
              
              {/* Botón con micro-interacción (Crece al hacer hover) */}
              <Button 
                type="submit" fullWidth variant="contained" color="primary" size="large" 
                sx={{ 
                  mt: 4, mb: 3, py: 1.5, fontSize: '1.1rem',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 20px rgba(42, 157, 143, 0.4)'
                  }
                }}
              >
                Iniciar Sesión
              </Button>

              <Grid container direction="column" spacing={1.5} sx={{ mt: 2, textAlign: 'center' }}>
                <Grid item>
                  <MuiLink component={RouterLink} to="/recuperar-password" variant="body2" color="text.secondary" sx={{ textDecoration: 'none', '&:hover': { color: 'secondary.main' } }}>
                    ¿Olvidaste tu contraseña?
                  </MuiLink>
                </Grid>
                <Grid item>
                  <MuiLink component={RouterLink} to="/solicitar-acceso" variant="body2" color="primary.main" fontWeight="bold" sx={{ textDecoration: 'none', '&:hover': { color: 'secondary.main' } }}>
                    ¿Eres nuevo? Solicita acceso a tu vivienda
                  </MuiLink>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </Slide>
      </Grid>
    </Grid>
  );
}
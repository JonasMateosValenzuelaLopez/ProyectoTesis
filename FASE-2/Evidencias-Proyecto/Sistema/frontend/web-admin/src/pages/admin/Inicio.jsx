import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Grid, Paper, Card, CardContent, CardActions, 
  Button, Divider, List, ListItem, ListItemText, ListItemIcon, Chip,
  Grow, Fade, IconButton, Tooltip, Avatar, AvatarGroup
} from '@mui/material';
import { 
  AttachMoney as MoneyIcon, 
  WarningAmber as WarningIcon,
  QrCodeScanner as QrIcon,
  EventSeat as EventIcon,
  Campaign as CampaignIcon,
  Storefront as StoreIcon,
  CheckCircle as CheckCircleIcon,
  PendingActions as PendingIcon,
  ArrowForwardIos as ArrowIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';

export default function Inicio() {
  const [animar, setAnimar] = useState(false);

  useEffect(() => {
    setAnimar(true);
  }, []);

  return (
    <Box sx={{ width: '100%', maxWidth: '1600px', mx: 'auto' }}>
      
      {/* Cabecera Interactiva */}
      <Fade in={animar} timeout={800}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, mb: 4, gap: 2 }}>
          <Box>
            <Typography variant="h4" color="primary" fontWeight="bold" sx={{ textShadow: '1px 1px 2px rgba(0,0,0,0.05)' }}>
              Panel de Control
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Resumen operativo y financiero de la comunidad
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" color="secondary" startIcon={<QrIcon />} sx={{ borderRadius: 2, borderWidth: 2, '&:hover': { borderWidth: 2 } }}>
              Validar Visita QR
            </Button>
            <Button variant="contained" color="primary" startIcon={<MoneyIcon />} sx={{ borderRadius: 2, boxShadow: '0 4px 14px rgba(42, 157, 143, 0.4)' }}>
              Registrar Pago
            </Button>
          </Box>
        </Box>
      </Fade>

      {/* Fila 1: KPIs con Degradados y Efecto Hover */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Grow in={animar} timeout={1000}>
            <Card elevation={2} sx={{ 
              height: '100%', borderRadius: 3, transition: '0.3s', 
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              border: '1px solid rgba(45, 106, 79, 0.1)',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 24px rgba(45, 106, 79, 0.15)' } 
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography color="text.secondary" variant="overline" fontWeight="bold">Recaudación del Mes</Typography>
                  <Avatar sx={{ bgcolor: 'rgba(45, 106, 79, 0.1)', color: '#2D6A4F' }}><TrendingUpIcon /></Avatar>
                </Box>
                <Typography variant="h3" color="#2D6A4F" fontWeight="bold">$1.450.000</Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CheckCircleIcon fontSize="small" color="success" /> 75% de unidades al día
                </Typography>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Grow in={animar} timeout={1400}>
            <Card elevation={2} sx={{ 
              height: '100%', borderRadius: 3, transition: '0.3s',
              background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)',
              border: '1px solid rgba(230, 57, 70, 0.1)',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 24px rgba(230, 57, 70, 0.15)' } 
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography color="text.secondary" variant="overline" fontWeight="bold">Morosidad Activa</Typography>
                  <Avatar sx={{ bgcolor: 'rgba(230, 57, 70, 0.1)', color: '#E63946' }}><WarningIcon /></Avatar>
                </Box>
                <Typography variant="h3" color="#E63946" fontWeight="bold">$350.000</Typography>
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PendingIcon fontSize="small" color="error" /> Corresponde a 4 unidades
                </Typography>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button size="small" color="error" sx={{ fontWeight: 'bold' }}>Ver Detalle de Morosos</Button>
              </CardActions>
            </Card>
          </Grow>
        </Grid>

        <Grid item xs={12} md={4}>
          <Grow in={animar} timeout={1800}>
            <Card elevation={4} sx={{ 
              height: '100%', borderRadius: 3, transition: '0.3s',
              background: 'linear-gradient(135deg, #2A9D8F 0%, #1a6b61 100%)',
              color: 'white',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: '0 12px 24px rgba(42, 157, 143, 0.3)' } 
            }}>
              <CardContent>
                <Typography gutterBottom variant="overline" fontWeight="bold" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Estado de la Comunidad
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, px: 1 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight="bold">42</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Residentes</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight="bold">15</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Unidades</Typography>
                  </Box>
                </Box>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                  <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 30, height: 30, fontSize: '0.8rem', borderColor: '#1a6b61' } }}>
                    <Avatar alt="Remy Sharp" />
                    <Avatar alt="Travis Howard" />
                    <Avatar alt="Cindy Baker" />
                    <Avatar alt="Agnes Walker" />
                    <Avatar alt="Trevor Henderson" />
                  </AvatarGroup>
                </Box>
              </CardContent>
            </Card>
          </Grow>
        </Grid>
      </Grid>

      {/* Fila 2: Paneles Operativos */}
      <Fade in={animar} timeout={2200}>
        <Grid container spacing={4}>
          
          {/* Panel de Accesos QR */}
          <Grid item xs={12} lg={6}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 3, height: '100%', border: '1px solid #eee' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'rgba(42, 157, 143, 0.1)', color: 'primary.main' }}><QrIcon /></Avatar>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">Control de Accesos Diarios</Typography>
                </Box>
                <Tooltip title="Ver historial completo">
                  <IconButton size="small"><ArrowIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                <ListItem sx={{ px: 1, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                  <ListItemIcon><PendingIcon color="warning" fontSize="large" /></ListItemIcon>
                  <ListItemText primary="Visita técnica (VTR)" secondary="Casa 14 - Esperando llegada" primaryTypographyProps={{ fontWeight: 'bold' }} />
                  <Chip label="Pendiente" size="small" color="warning" />
                </ListItem>
                <ListItem sx={{ px: 1, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                  <ListItemIcon><CheckCircleIcon color="success" fontSize="large" /></ListItemIcon>
                  <ListItemText primary="Familiar: Pedro Gómez" secondary="Depto 402 - Ingresó a las 10:15" primaryTypographyProps={{ fontWeight: 'bold' }} />
                  <Chip label="Validado" size="small" color="success" variant="outlined" />
                </ListItem>
              </List>
            </Paper>
          </Grid>

          {/* Panel Comunitario y Reservas */}
          <Grid item xs={12} lg={6}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 3, height: '100%', border: '1px solid #eee' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: 'rgba(244, 162, 97, 0.2)', color: '#d97706' }}><EventIcon /></Avatar>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">Actividad Vecinal y Reservas</Typography>
                </Box>
                <Tooltip title="Administrar comunidad">
                  <IconButton size="small"><ArrowIcon fontSize="small" /></IconButton>
                </Tooltip>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <List disablePadding>
                <ListItem sx={{ px: 1, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, cursor: 'pointer' }}>
                  <ListItemIcon><Avatar sx={{ bgcolor: 'secondary.main', width: 35, height: 35 }}><EventIcon fontSize="small" /></Avatar></ListItemIcon>
                  <ListItemText primary="Quincho Sur" secondary="Reservado por Casa 15 (Sábado 20:00)" primaryTypographyProps={{ fontWeight: 'bold' }} />
                  <Chip label="Confirmado" size="small" color="primary" sx={{ bgcolor: 'primary.light' }} />
                </ListItem>
                <ListItem sx={{ px: 1, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, cursor: 'pointer' }}>
                  <ListItemIcon><Avatar sx={{ bgcolor: 'info.main', width: 35, height: 35 }}><CampaignIcon fontSize="small" /></Avatar></ListItemIcon>
                  <ListItemText primary="Muro de Noticias" secondary="Último aviso: Mantención de ascensores" primaryTypographyProps={{ fontWeight: 'bold' }} />
                </ListItem>
                <ListItem sx={{ px: 1, py: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, cursor: 'pointer' }}>
                  <ListItemIcon><Avatar sx={{ bgcolor: 'success.main', width: 35, height: 35 }}><StoreIcon fontSize="small" /></Avatar></ListItemIcon>
                  <ListItemText primary="Marketplace Vecinal" secondary="3 nuevos productos publicados hoy" primaryTypographyProps={{ fontWeight: 'bold' }} />
                </ListItem>
              </List>
            </Paper>
          </Grid>

        </Grid>
      </Fade>
      
    </Box>
  );
}
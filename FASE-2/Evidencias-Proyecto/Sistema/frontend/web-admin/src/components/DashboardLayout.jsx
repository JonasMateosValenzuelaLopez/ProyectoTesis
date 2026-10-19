import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider, IconButton, 
  ListItem, ListItemButton, ListItemIcon, ListItemText, Avatar, Tooltip 
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Dashboard as DashboardIcon, 
  Domain as DomainIcon, 
  HomeWork as HomeWorkIcon, 
  People as PeopleIcon, 
  Logout as LogoutIcon ,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';


const drawerWidth = 260;

export default function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    // Aquí luego limpiaremos el token JWT de NestJS
    console.log('Cerrando sesión...');
    navigate('/login');
  };

  // Menú lateral estructurado según el Sprint 1
  const menuItems = [
    { text: 'Inicio', icon: <DashboardIcon />, path: '/panel' },
    { text: 'Red Vecinal', icon: <DomainIcon />, path: '/panel/condominio' },
    { text: 'Unidades', icon: <HomeWorkIcon />, path: '/panel/unidades' },
    { text: 'Residentes y Roles', icon: <PeopleIcon />, path: '/panel/residentes' },
    { text: 'Finanzas', icon: <AttachMoneyIcon />, path: '/panel/finanzas' }, // <--- AGREGAR ESTA LÍNEA
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Typography variant="h5" color="primary" fontWeight="bold">
          EntreCasas
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ px: 2, pt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? 'rgba(42, 157, 143, 0.1)' : 'transparent',
                  color: isActive ? 'primary.main' : 'text.primary',
                  '&:hover': { bgcolor: 'rgba(42, 157, 143, 0.05)' }
                }}
              >
                <ListItemIcon sx={{ color: isActive ? 'primary.main' : 'inherit', minWidth: 40 }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 'bold' : 'medium' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      
      {/* Barra Superior (Navbar) */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          width: { sm: `calc(100% - ${drawerWidth}px)` }, 
          ml: { sm: `${drawerWidth}px` },
          bgcolor: '#FFFFFF',
          borderBottom: '1px solid #E0E0E0',
          color: 'text.primary'
        }}
      >
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1 }} />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" fontWeight="bold">
              Administrador
            </Typography>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 35, height: 35 }}>A</Avatar>
            <Tooltip title="Cerrar Sesión">
              <IconButton color="error" onClick={handleLogout}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menú Lateral (Sidebar) */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        {/* Versión Móvil */}
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}>
          {drawer}
        </Drawer>
        {/* Versión Escritorio */}
        <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #E0E0E0' } }} open>
          {drawer}
        </Drawer>
      </Box>

      {/* Contenedor Central Dinámico */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Toolbar /> {/* Espaciador para que el contenido no quede oculto bajo el AppBar */}
        
        {/* Aquí se renderizarán las vistas dinámicas (Tablas, Formularios, etc.) */}
        <Outlet /> 

      </Box>
    </Box>
  );
}
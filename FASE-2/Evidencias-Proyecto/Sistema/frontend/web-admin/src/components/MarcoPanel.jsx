import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, IconButton,
  ListItemButton, ListItemIcon, ListItemText, Badge,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import PlacaUnidad from './marca/PlacaUnidad';

const drawerWidth = 248;

// Armazón compartido por el panel de la comunidad y el de la plataforma:
// menú lateral oscuro con secciones, barra superior y contenido.
// `barra` es lo que va en la barra superior; `activo(item, ruta)` decide qué opción se marca.
const exacto = (item, ruta) => item.ruta === ruta;

export default function MarcoPanel({ secciones, contadores = {}, barra, etiquetaMenu, marca, activo = exacto }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const ir = (ruta) => {
    navigate(ruta);
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ height: '100%', bgcolor: 'marca.sidebar', color: 'marca.sidebarInk', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2.5, py: 2.25 }}>
        <PlacaUnidad tipo="" numero="EC" size="sm" invertida />
        <Typography sx={{ color: '#fff', fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.15rem' }}>
          EntreCasas
        </Typography>
      </Box>
      {marca && <Box sx={{ px: 2.5, mt: -1 }}>{marca}</Box>}
      <Box component="nav" aria-label={etiquetaMenu} sx={{ px: 1.5, pb: 2, overflowY: 'auto', flex: 1 }}>
        {secciones.map((seccion) => (
          <Box key={seccion.titulo} sx={{ mt: 1.5 }}>
            <Typography variant="overline" component="div" sx={{ px: 1.25, fontSize: '0.68rem', color: 'marca.sidebarMuted' }}>
              {seccion.titulo}
            </Typography>
            <List dense disablePadding>
              {seccion.items.map((item) => {
                const isActive = activo(item, location.pathname);
                const cuenta = item.pendiente ? contadores[item.pendiente] : 0;
                return (
                  <ListItemButton
                    key={item.ruta}
                    onClick={() => ir(item.ruta)}
                    selected={isActive}
                    aria-current={isActive ? 'page' : undefined}
                    sx={{
                      borderRadius: 1.5, mb: 0.25, py: 0.75, color: 'inherit',
                      transition: 'background-color 150ms ease, color 150ms ease',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: '#fff' },
                      '&.Mui-selected, &.Mui-selected:hover': { bgcolor: 'marca.sidebarActive', color: '#fff' },
                      '&.Mui-selected::before': {
                        content: '""', position: 'absolute', left: 0, top: 8, bottom: 8,
                        width: 3, borderRadius: 2, bgcolor: 'marca.bronzeOnSidebar',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: 34, '& svg': { fontSize: 20 } }}>{item.icono}</ListItemIcon>
                    <ListItemText primary={item.texto} slotProps={{ primary: { fontSize: '0.875rem', fontWeight: isActive ? 700 : 500 } }} />
                    {cuenta > 0 && (
                      <Badge badgeContent={cuenta} sx={{ mr: 1, '& .MuiBadge-badge': { position: 'static', transform: 'none', bgcolor: 'marca.bronzeOnSidebar', color: 'marca.sidebar', fontWeight: 800 } }} />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ width: { sm: `calc(100% - ${drawerWidth}px)` }, ml: { sm: `${drawerWidth}px` } }}>
        <Toolbar sx={{ gap: 1.5 }}>
          <IconButton edge="start" aria-label="Abrir menú" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>
          {barra}
        </Toolbar>
      </AppBar>

      <Box sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 0 } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent" open
          sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 0 } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 }, width: { sm: `calc(100% - ${drawerWidth}px)` }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

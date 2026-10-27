import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip,
  Grid, Avatar, Divider, Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, 
  Person as PersonIcon, Visibility as VisibilityIcon,
  Email as EmailIcon, WhatsApp as WhatsAppIcon, Phone as PhoneIcon
} from '@mui/icons-material';

export default function Residentes() {
  const [openModalCrear, setOpenModalCrear] = useState(false);
  const [openModalPerfil, setOpenModalPerfil] = useState(false);
  
  const [nuevoUsuario, setNuevoUsuario] = useState({ rut: '', nombre: '', correo: '', telefono: '', rol: 'Residente', unidad: '' });
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const rolesDisponibles = ['Administrador', 'Comité (Presidente/Tesorero)', 'Conserje', 'Residente'];
  const unidadesDisponibles = ['Casa 14', 'Casa 15', 'Depto 402', 'Depto 501', 'Sin unidad (Trabajador)'];
  
  const [usuarios, setUsuarios] = useState([
    { id: 1, rut: '19.876.543-2', nombre: 'Juan Pérez', correo: 'juan@correo.cl', telefono: '+56912345678', rol: 'Residente', unidad: 'Casa 15', fechaRegistro: '2026-03-15' },
    { id: 2, rut: '15.123.456-7', nombre: 'María González', correo: 'maria@correo.cl', telefono: '+56987654321', rol: 'Conserje', unidad: 'Sin unidad (Trabajador)', fechaRegistro: '2026-01-10' }
  ]);

  // Manejo de Modal Crear
  const handleOpenCrear = () => setOpenModalCrear(true);
  const handleCloseCrear = () => setOpenModalCrear(false);
  const handleChangeCrear = (e) => setNuevoUsuario({ ...nuevoUsuario, [e.target.name]: e.target.value });
  const handleSubmitCrear = (e) => {
    e.preventDefault();
    setUsuarios([...usuarios, { ...nuevoUsuario, id: usuarios.length + 1, fechaRegistro: new Date().toISOString().split('T')[0] }]);
    handleCloseCrear();
    setNuevoUsuario({ rut: '', nombre: '', correo: '', telefono: '', rol: 'Residente', unidad: '' });
  };

  // Manejo de Modal Perfil
  const handleVerPerfil = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setOpenModalPerfil(true);
  };
  const handleClosePerfil = () => {
    setOpenModalPerfil(false);
    setUsuarioSeleccionado(null);
  };

  const getRoleColor = (rol) => {
    if (rol.includes('Administrador') || rol.includes('Comité')) return 'primary';
    if (rol === 'Conserje') return 'warning';
    return 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          Directorio de Usuarios y Roles
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpenCrear}>
          Registrar Usuario
        </Button>
      </Box>

      {/* Tabla de Datos */}
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'rgba(42, 157, 143, 0.1)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>RUT</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre Completo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Rol / Permiso</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vivienda Asociada</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                <TableCell sx={{ fontWeight: '500' }}>{row.rut}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" color="action" /> {row.nombre}
                  </Box>
                </TableCell>
                <TableCell><Chip label={row.rol} size="small" color={getRoleColor(row.rol)} /></TableCell>
                <TableCell>
                  {row.unidad.includes('Sin unidad') ? <Typography variant="body2" color="text.secondary" fontStyle="italic">N/A</Typography> : row.unidad}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Ver Perfil y Contactar">
                    <IconButton color="info" size="small" onClick={() => handleVerPerfil(row)}><VisibilityIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Editar Datos">
                    <IconButton color="primary" size="small"><EditIcon /></IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar Usuario">
                    <IconButton color="error" size="small"><DeleteIcon /></IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal: Crear Usuario */}
      <Dialog open={openModalCrear} onClose={handleCloseCrear} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Dar de Alta Nuevo Usuario</DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="form-usuario" onSubmit={handleSubmitCrear} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="RUT" name="rut" required fullWidth value={nuevoUsuario.rut} onChange={handleChangeCrear} />
            <TextField label="Nombre Completo" name="nombre" required fullWidth value={nuevoUsuario.nombre} onChange={handleChangeCrear} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField label="Correo" name="correo" type="email" required fullWidth value={nuevoUsuario.correo} onChange={handleChangeCrear} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Teléfono" name="telefono" placeholder="+569..." fullWidth value={nuevoUsuario.telefono} onChange={handleChangeCrear} />
              </Grid>
            </Grid>
            <TextField select label="Nivel de Acceso (Rol)" name="rol" required fullWidth value={nuevoUsuario.rol} onChange={handleChangeCrear}>
              {rolesDisponibles.map((rol, i) => <MenuItem key={i} value={rol}>{rol}</MenuItem>)}
            </TextField>
            <TextField select label="Vivienda Asociada" name="unidad" required fullWidth value={nuevoUsuario.unidad} onChange={handleChangeCrear}>
              {unidadesDisponibles.map((unidad, i) => <MenuItem key={i} value={unidad}>{unidad}</MenuItem>)}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseCrear} color="inherit">Cancelar</Button>
          <Button type="submit" form="form-usuario" variant="contained" color="primary">Guardar Usuario</Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Perfil del Residente */}
      <Dialog open={openModalPerfil} onClose={handleClosePerfil} maxWidth="sm" fullWidth>
        {usuarioSeleccionado && (
          <>
            <DialogTitle sx={{ bgcolor: 'rgba(42, 157, 143, 0.05)', pb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ width: 60, height: 60, bgcolor: 'primary.main', fontSize: '1.5rem' }}>
                  {usuarioSeleccionado.nombre.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold" color="text.primary">
                    {usuarioSeleccionado.nombre}
                  </Typography>
                  <Chip label={usuarioSeleccionado.rol} size="small" color={getRoleColor(usuarioSeleccionado.rol)} sx={{ mt: 0.5 }} />
                </Box>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ pt: 3 }}>
              <Grid container spacing={3}>
                {/* Columna de Datos */}
                <Grid item xs={12} sm={7}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">Información Personal</Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}><strong>RUT:</strong> {usuarioSeleccionado.rut}</Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}><strong>Vivienda:</strong> {usuarioSeleccionado.unidad}</Typography>
                  <Typography variant="body1" sx={{ mb: 1 }}><strong>Miembro desde:</strong> {usuarioSeleccionado.fechaRegistro}</Typography>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Typography variant="overline" color="text.secondary" fontWeight="bold">Datos de Contacto</Typography>
                  <Typography variant="body1" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon fontSize="small" color="action"/> {usuarioSeleccionado.correo}
                  </Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PhoneIcon fontSize="small" color="action"/> {usuarioSeleccionado.telefono || 'No registrado'}
                  </Typography>
                </Grid>

                {/* Columna de Acciones de Comunicación */}
                <Grid item xs={12} sm={5} sx={{ display: 'flex', flexDirection: 'column', gap: 2, borderLeft: { sm: '1px solid #eee' }, pl: { sm: 3 } }}>
                  <Typography variant="overline" color="text.secondary" fontWeight="bold" align="center">
                    Contactar Directamente
                  </Typography>
                  
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    startIcon={<EmailIcon />} 
                    fullWidth
                    href={`mailto:${usuarioSeleccionado.correo}`}
                  >
                    Enviar Correo
                  </Button>
                  
                  <Button 
                    variant="contained" 
                    color="success" 
                    startIcon={<WhatsAppIcon />} 
                    fullWidth
                    disabled={!usuarioSeleccionado.telefono}
                    href={`https://wa.me/${usuarioSeleccionado.telefono?.replace('+', '')}`}
                    target="_blank"
                  >
                    WhatsApp
                  </Button>

                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    fullWidth
                    sx={{ mt: 'auto' }}
                    disabled // Deshabilitado hasta integrar módulo de mensajería
                  >
                    Mensaje Interno (Próximamente)
                  </Button>
                </Grid>
              </Grid>
            </DialogContent>
            
            <DialogActions sx={{ p: 2, bgcolor: 'background.default' }}>
              <Button onClick={handleClosePerfil} color="inherit">Cerrar Perfil</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
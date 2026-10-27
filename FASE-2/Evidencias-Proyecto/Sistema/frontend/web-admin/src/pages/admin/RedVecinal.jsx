import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

export default function RedVecinal() {
  const [openModal, setOpenModal] = useState(false);
  const [nuevoCondominio, setNuevoCondominio] = useState({ nombre: '', tipo: '', direccion: '' });

  // Datos simulados (Mock) mientras Camila termina la API REST en Node.js
  const [condominios, setCondominios] = useState([
    { id: 1, nombre: 'Condominio Las Palmas', tipo: 'Condominio', direccion: 'Av. Siempre Viva 123', fecha: '2026-10-18' }
  ]);

  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);

  const handleChange = (e) => {
    setNuevoCondominio({ ...nuevoCondominio, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí se enviará el POST al backend
    const nuevo = {
      ...nuevoCondominio,
      id: condominios.length + 1,
      fecha: new Date().toISOString().split('T')[0]
    };
    setCondominios([...condominios, nuevo]);
    handleClose();
    setNuevoCondominio({ nombre: '', tipo: '', direccion: '' });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          Gestión de Red Vecinal
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen}>
          Registrar Red
        </Button>
      </Box>

      {/* Tabla de Datos */}
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'rgba(42, 157, 143, 0.1)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Dirección</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Fecha Registro</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {condominios.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.nombre}</TableCell>
                <TableCell>{row.tipo}</TableCell>
                <TableCell>{row.direccion}</TableCell>
                <TableCell>{row.fecha}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" size="small"><EditIcon /></IconButton>
                  <IconButton color="error" size="small"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal para Crear Nueva Red Vecinal */}
      <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Registrar Nueva Red Vecinal</DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="form-condominio" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Nombre del Recinto" name="nombre" required fullWidth value={nuevoCondominio.nombre} onChange={handleChange} />
            <TextField select label="Tipo de Red" name="tipo" required fullWidth value={nuevoCondominio.tipo} onChange={handleChange}>
              <MenuItem value="Condominio">Condominio</MenuItem>
              <MenuItem value="Villa">Villa</MenuItem>
              <MenuItem value="Edificio">Edificio</MenuItem>
            </TextField>
            <TextField label="Dirección Completa" name="direccion" required fullWidth value={nuevoCondominio.direccion} onChange={handleChange} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button type="submit" form="form-condominio" variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
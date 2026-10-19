import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Chip 
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, HomeWork as HomeWorkIcon } from '@mui/icons-material';

export default function Unidades() {
  const [openModal, setOpenModal] = useState(false);
  const [nuevaUnidad, setNuevaUnidad] = useState({ numero: '', redVecinal: '', estado: 'Desocupada' });

  // Datos simulados. Luego Camila los traerá desde PostgreSQL/MariaDB vía API REST
  const redesDisponibles = ['Condominio Las Palmas', 'Villa Los Aromos', 'Edificio Central'];
  const [unidades, setUnidades] = useState([
    { id: 1, numero: 'Casa 15', redVecinal: 'Condominio Las Palmas', estado: 'Ocupada' },
    { id: 2, numero: 'Depto 402', redVecinal: 'Edificio Central', estado: 'Desocupada' }
  ]);

  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);

  const handleChange = (e) => {
    setNuevaUnidad({ ...nuevaUnidad, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const unidad = { ...nuevaUnidad, id: unidades.length + 1 };
    setUnidades([...unidades, unidad]);
    handleClose();
    setNuevaUnidad({ numero: '', redVecinal: '', estado: 'Desocupada' });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          Gestión de Unidades
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen}>
          Registrar Unidad
        </Button>
      </Box>

      {/* Tabla de Datos */}
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'rgba(42, 157, 143, 0.1)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Número / Identificador</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Red Vecinal (Condominio)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {unidades.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                <TableCell>{row.id}</TableCell>
                <TableCell sx={{ fontWeight: '500' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <HomeWorkIcon fontSize="small" color="action" /> {row.numero}
                  </Box>
                </TableCell>
                <TableCell>{row.redVecinal}</TableCell>
                <TableCell>
                  <Chip 
                    label={row.estado} 
                    size="small" 
                    color={row.estado === 'Ocupada' ? 'success' : 'default'} 
                    variant={row.estado === 'Ocupada' ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" size="small"><EditIcon /></IconButton>
                  <IconButton color="error" size="small"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal para Crear Nueva Unidad */}
      <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Registrar Vivienda</DialogTitle>
        <DialogContent dividers>
          <Box component="form" id="form-unidad" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            
            <TextField select label="Pertenece a la Red Vecinal" name="redVecinal" required fullWidth value={nuevaUnidad.redVecinal} onChange={handleChange}>
              {redesDisponibles.map((red, index) => (
                <MenuItem key={index} value={red}>{red}</MenuItem>
              ))}
            </TextField>

            <TextField label="Número de Casa o Departamento" name="numero" placeholder="Ej: Casa 14, Depto 501" required fullWidth value={nuevaUnidad.numero} onChange={handleChange} />
            
            <TextField select label="Estado Inicial" name="estado" required fullWidth value={nuevaUnidad.estado} onChange={handleChange}>
              <MenuItem value="Desocupada">Desocupada (Sin residentes)</MenuItem>
              <MenuItem value="Ocupada">Ocupada</MenuItem>
            </TextField>

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button type="submit" form="form-unidad" variant="contained" color="primary">Guardar Vivienda</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
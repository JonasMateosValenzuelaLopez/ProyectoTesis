import React, { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Chip, InputAdornment 
} from '@mui/material';
import { 
  Add as AddIcon, 
  Receipt as ReceiptIcon, 
  WarningAmber as WarningIcon,
  CheckCircle as CheckIcon 
} from '@mui/icons-material';

export default function GastosComunes() {
  const [openModal, setOpenModal] = useState(false);
  const [nuevoCobro, setNuevoCobro] = useState({ mes: '', monto: '', vencimiento: '', descripcion: 'Gasto Común Fijo' });

  // Datos simulados del estado financiero de las unidades
  const [finanzas, setFinanzas] = useState([
    { id: 1, unidad: 'Casa 14', residente: 'Pendiente', cargoMes: 65000, deudaTotal: 0, estado: 'Al Día' },
    { id: 2, unidad: 'Casa 15', residente: 'Juan Pérez', cargoMes: 65000, deudaTotal: 130000, estado: 'Moroso' },
    { id: 3, unidad: 'Depto 402', residente: 'Sin residente', cargoMes: 45000, deudaTotal: 45000, estado: 'Pendiente' }
  ]);

  const handleOpen = () => setOpenModal(true);
  const handleClose = () => setOpenModal(false);

  const handleChange = (e) => setNuevoCobro({ ...nuevoCobro, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Emitiendo cobro masivo/individual:', nuevoCobro);
    handleClose();
    setNuevoCobro({ mes: '', monto: '', vencimiento: '', descripcion: 'Gasto Común Fijo' });
  };

  const getEstadoColor = (estado) => {
    if (estado === 'Al Día') return 'success';
    if (estado === 'Moroso') return 'error';
    return 'warning';
  };

  const formatCurrency = (monto) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(monto);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="primary" fontWeight="bold">
          Finanzas y Gastos Comunes
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleOpen}>
          Emitir Nuevo Cobro
        </Button>
      </Box>

      {/* Tabla de Finanzas */}
      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 700 }}>
          <TableHead sx={{ bgcolor: 'rgba(42, 157, 143, 0.1)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Unidad</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Residente Principal</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cargo del Mes</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Deuda Total Acumulada</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Estado Financiero</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Comprobantes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {finanzas.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{row.unidad}</TableCell>
                <TableCell>{row.residente}</TableCell>
                <TableCell>{formatCurrency(row.cargoMes)}</TableCell>
                <TableCell sx={{ color: row.deudaTotal > 0 ? 'error.main' : 'inherit', fontWeight: row.deudaTotal > 0 ? 'bold' : 'normal' }}>
                  {formatCurrency(row.deudaTotal)}
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={row.estado === 'Al Día' ? <CheckIcon /> : <WarningIcon />} 
                    label={row.estado} 
                    color={getEstadoColor(row.estado)} 
                    variant={row.estado === 'Al Día' ? 'outlined' : 'filled'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" title="Ver Comprobantes"><ReceiptIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal para Emitir Cobro de Gasto Común */}
      <Dialog open={openModal} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Emitir Gasto Común Fijo</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Registra el cobro administrativo mensual. Este monto se reflejará en la cuenta de las unidades seleccionadas.
          </Typography>
          <Box component="form" id="form-cobro" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            <TextField label="Mes a cobrar" name="mes" placeholder="Ej: Octubre 2026" required fullWidth value={nuevoCobro.mes} onChange={handleChange} />
            
            <TextField label="Concepto / Descripción" name="descripcion" required fullWidth value={nuevoCobro.descripcion} onChange={handleChange} />

            <TextField 
              label="Monto Fijo (CLP)" 
              name="monto" 
              type="number" 
              required 
              fullWidth 
              value={nuevoCobro.monto} 
              onChange={handleChange} 
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
            
            <TextField label="Fecha de Vencimiento" name="vencimiento" type="date" required fullWidth value={nuevoCobro.vencimiento} onChange={handleChange} InputLabelProps={{ shrink: true }} />

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button type="submit" form="form-cobro" variant="contained" color="primary">Generar Cobros</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
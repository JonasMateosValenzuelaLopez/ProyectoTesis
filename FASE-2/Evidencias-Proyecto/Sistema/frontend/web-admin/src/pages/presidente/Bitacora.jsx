import { useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { fechaHora } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import SelloCargo from '../../components/marca/SelloCargo';

// Bitácora de auditoría: el Presidente supervisa las acciones del administrador.
export default function Bitacora() {
  const { comunidad } = useSesion();
  const { bitacora } = useFinanzas();
  const [filtro, setFiltro] = useState('administrador');
  const [busqueda, setBusqueda] = useState('');
  const texto = busqueda.trim().toLowerCase();
  const lista = bitacora
    .filter((b) => filtro === 'todos' || b.cargo === filtro)
    .filter((b) => !texto || `${b.accion} ${b.detalle} ${b.usuario}`.toLowerCase().includes(texto));

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Bitácora del administrador"
        descripcion="Registro de las acciones relevantes en la comunidad. No se puede editar ni borrar."
      />

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <ToggleButtonGroup size="small" exclusive value={filtro} onChange={(_, v) => v && setFiltro(v)}>
          <ToggleButton value="administrador">Administración</ToggleButton>
          <ToggleButton value="todos">Todos los cargos</ToggleButton>
        </ToggleButtonGroup>
        <TextField size="small" label="Buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ minWidth: 240 }} />
      </Box>

      {/* En el celular cada acción es un bloque: qué se hizo primero, quién y cuándo debajo */}
      <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
        {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>No hay acciones que coincidan.</Typography>}
        {lista.map((b, i) => (
          <Box key={b.id_bitacora} sx={{ px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', display: 'grid', gap: 0.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{b.accion}</Typography>
            <Typography variant="body2" color="text.secondary">{b.detalle}</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <SelloCargo cargo={b.cargo} size={18} />
              <Typography variant="body2"><b>{b.usuario}</b> · {fechaHora(b.fecha)}</Typography>
            </Box>
          </Box>
        ))}
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 160 }}>Fecha</TableCell>
              <TableCell sx={{ width: 220 }}>Quién</TableCell>
              <TableCell>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={3}><Typography color="text.secondary">No hay acciones que coincidan.</Typography></TableCell></TableRow>
            )}
            {lista.map((b) => (
              <TableRow key={b.id_bitacora}>
                <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{fechaHora(b.fecha)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <SelloCargo cargo={b.cargo} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{b.usuario}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>{b.accion}</Typography>
                  <Typography variant="body2" color="text.secondary">{b.detalle}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

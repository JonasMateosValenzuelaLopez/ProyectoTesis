import { useState } from 'react';
import {
  Box, Button, ButtonBase, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { NotificationsActiveOutlined as RecordarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { residentes } from '../../data/finanzasMock';
import { clp, fechaHora } from '../../utils/formato';
import { puedeGestionarFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoRecordatorio from '../../components/finanzas/DialogoRecordatorio';

export default function Morosidad() {
  const { comunidad, cargo } = useSesion();
  const { morosos, resumen, ultimoRecordatorio } = useFinanzas();
  const [unidad, setUnidad] = useState(null);
  const [recordatorio, setRecordatorio] = useState(false);
  const gestiona = puedeGestionarFinanzas(cargo, comunidad);

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Morosidad"
        descripcion={morosos.length
          ? `${morosos.length} unidades deben ${clp(resumen.deudaMorosa)} de meses anteriores.${ultimoRecordatorio ? ` Último recordatorio: ${fechaHora(ultimoRecordatorio.fecha)}.` : ''}`
          : 'Ninguna unidad tiene deuda de meses anteriores.'}
        acciones={gestiona && morosos.length > 0 && (
          <Button variant="contained" startIcon={<RecordarIcon />} onClick={() => setRecordatorio(true)}>
            Recordar a las {morosos.length} unidades
          </Button>
        )}
      />

      {morosos.length > 0 && (
        <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
          {morosos.map((m, i) => (
            <ButtonBase key={m.unidad.id} onClick={() => setUnidad(m.unidad)} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', width: '100%', textAlign: 'left', px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', '&:active': { bgcolor: 'action.hover' } }}>
              <PlacaUnidad tipo={m.unidad.tipo} numero={m.unidad.numero} size="sm" />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{residentes[m.unidad.id]}</Typography>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>{clp(m.deudaAnterior)}</Box> anterior · {clp(m.pendienteMes)} este mes
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{clp(m.total)}</Typography>
            </ButtonBase>
          ))}
        </Paper>
      )}

      {morosos.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
          <Table sx={{ minWidth: 680 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unidad</TableCell>
                <TableCell align="right">Deuda anterior</TableCell>
                <TableCell align="right">Pendiente este mes</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {morosos.map((m) => (
                <TableRow key={m.unidad.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PlacaUnidad tipo={m.unidad.tipo} numero={m.unidad.numero} size="sm" />
                      <Typography sx={{ fontWeight: 700 }}>{residentes[m.unidad.id]}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{clp(m.deudaAnterior)}</TableCell>
                  <TableCell align="right">{clp(m.pendienteMes)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{clp(m.total)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setUnidad(m.unidad)}>{gestiona ? 'Registrar pago' : 'Ver detalle'}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <DialogoUnidad unidad={unidad} onClose={() => setUnidad(null)} soloLectura={!gestiona} />
      <DialogoRecordatorio open={recordatorio} onClose={() => setRecordatorio(false)} />
    </Box>
  );
}

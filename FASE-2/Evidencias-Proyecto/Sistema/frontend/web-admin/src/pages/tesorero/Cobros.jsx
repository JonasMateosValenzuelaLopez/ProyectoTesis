import { useState } from 'react';
import {
  Box, Button, Chip, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { clp, fecha, fechaHora } from '../../utils/formato';
import { puedeGestionarFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';

export default function Cobros() {
  const { comunidad, cargo } = useSesion();
  const { datos } = useFinanzas();
  const [nuevo, setNuevo] = useState(false);
  const gestiona = puedeGestionarFinanzas(cargo, comunidad);
  const categoria = (id) => datos.categorias.find((c) => c.id === id)?.nombre ?? '—';
  const cobros = [...datos.cobros].reverse();

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Cobros"
        descripcion="Cada cobro se crea por categoría y envía un correo automático a las unidades. La plataforma no recibe pagos: se marcan a mano cuando llega la transferencia."
        acciones={gestiona && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevo(true)}>Nuevo cobro</Button>}
      />

      {/* En el celular cada cobro es un bloque: concepto, avance y recaudado; la tabla queda para pantallas anchas */}
      <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden', mb: 3 }}>
        {cobros.map((c, i) => {
          const filas = Object.values(datos.cobroUnidades[c.id] ?? {});
          const pagadas = filas.filter((f) => f.estado === 'pagado').length;
          const cobrables = filas.filter((f) => f.estado !== 'exento').length;
          return (
            <Box key={c.id} sx={{ px: 2, py: 1.5, display: 'grid', gap: 0.75, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline' }}>
                <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{clp(c.montoPorUnidad)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {categoria(c.idCategoria)}{c.extraordinario ? ' · extraordinario' : ''} · vence {fecha(c.vencimiento)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress variant="determinate" value={cobrables ? (pagadas / cobrables) * 100 : 0} color="success" sx={{ flex: 1, height: 5, borderRadius: 1.5, bgcolor: 'divider' }} />
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}><b>{pagadas}/{cobrables}</b> · {clp(pagadas * c.montoPorUnidad)}</Typography>
              </Box>
            </Box>
          );
        })}
        {cobros.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Todavía no hay cobros. Crea el primero con «Nuevo cobro».</Typography>}
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5, mb: 3 }}>
        <Table sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Concepto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Por unidad</TableCell>
              <TableCell sx={{ width: 180 }}>Pagadas</TableCell>
              <TableCell align="right">Recaudado</TableCell>
              <TableCell>Vence</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cobros.map((c) => {
              const filas = Object.values(datos.cobroUnidades[c.id] ?? {});
              const pagadas = filas.filter((f) => f.estado === 'pagado').length;
              const cobrables = filas.filter((f) => f.estado !== 'exento').length;
              return (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                    {c.extraordinario && <Chip size="small" label="Extraordinario" variant="outlined" sx={{ mt: 0.5 }} />}
                  </TableCell>
                  <TableCell>{categoria(c.idCategoria)}</TableCell>
                  <TableCell align="right">{clp(c.montoPorUnidad)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={cobrables ? (pagadas / cobrables) * 100 : 0} color="success" sx={{ flex: 1, height: 5, borderRadius: 1.5, bgcolor: 'divider' }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{pagadas}/{cobrables}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{clp(pagadas * c.montoPorUnidad)}</TableCell>
                  <TableCell>{fecha(c.vencimiento)}</TableCell>
                </TableRow>
              );
            })}
            {cobros.length === 0 && (
              <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2 }}>Todavía no hay cobros. Crea el primero con «Nuevo cobro».</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Tarjeta titulo="Correos enviados" sx={{ maxWidth: 720 }}>
        {datos.notificaciones.length === 0 ? (
          <Typography color="text.secondary">Todavía no se envían correos en esta comunidad. Se envían solos al crear un cobro.</Typography>
        ) : (
          <Box sx={{ display: 'grid' }}>
            {datos.notificaciones.map((n, i) => (
              <Box key={n.id} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, py: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{n.tipo === 'recordatorio' ? 'Recordatorio de morosidad' : `Nuevo cobro: ${n.detalle}`}</Typography>
                  <Typography variant="body2" color="text.secondary">{n.destinatarios} unidades</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{fechaHora(n.fecha)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Tarjeta>

      <DialogoNuevoCobro open={nuevo} onClose={() => setNuevo(false)} />
    </Box>
  );
}

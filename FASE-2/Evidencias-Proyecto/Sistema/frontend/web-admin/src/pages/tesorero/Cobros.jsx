import { useState } from 'react';
import {
  Box, Button, Chip, IconButton, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, EditOutlined as EditarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { clp, fecha, fechaHora } from '../../utils/formato';
import { puedeGestionarFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';
import DialogoEditarCobro from '../../components/finanzas/DialogoEditarCobro';

// Texto solo para lectores de pantalla (encabezado de la columna de acciones)
const visualmenteOculto = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

export default function Cobros() {
  const { comunidad, cargo } = useSesion();
  const { datos, categoriaPorId, gastosPorCobro, correosEnviados } = useFinanzas();
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const gestiona = puedeGestionarFinanzas(cargo, comunidad);
  const categoria = (id) => categoriaPorId[id]?.nombre ?? '—';
  const cobros = [...datos.cobros].reverse();
  // Avance de un cobro a partir de sus filas en `gastos_comunes`
  const avance = (c) => {
    const filas = gastosPorCobro[c.id_cobro] ?? [];
    const pagadas = filas.filter((g) => g.estado_pago === 'Pagado');
    return {
      pagadas: pagadas.length,
      cobrables: filas.filter((g) => g.estado_pago !== 'Exento').length,
      recaudado: pagadas.reduce((s, g) => s + g.monto_total, 0),
    };
  };

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
          const { pagadas, cobrables, recaudado } = avance(c);
          return (
            <Box key={c.id_cobro} sx={{ px: 2, py: 1.5, display: 'grid', gap: 0.75, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline' }}>
                <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{clp(c.monto_por_unidad)}</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {categoria(c.id_categoria)}{c.es_extraordinario ? ' · extraordinario' : ''} · vence {fecha(c.fecha_vencimiento)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress variant="determinate" value={cobrables ? (pagadas / cobrables) * 100 : 0} color="success" sx={{ flex: 1, height: 5, borderRadius: 1.5, bgcolor: 'divider' }} />
                <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}><b>{pagadas}/{cobrables}</b> · {clp(recaudado)}</Typography>
              </Box>
              {gestiona && (
                <Box>
                  <Button size="small" startIcon={<EditarIcon />} onClick={() => setEditando(c)} aria-label={`Editar ${c.concepto}`}>Editar</Button>
                </Box>
              )}
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
              {gestiona && <TableCell align="right" sx={{ width: 64 }}><Box component="span" sx={visualmenteOculto}>Acciones</Box></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {cobros.map((c) => {
              const { pagadas, cobrables, recaudado } = avance(c);
              return (
                <TableRow key={c.id_cobro} hover>
                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                    {c.es_extraordinario === 1 && <Chip size="small" label="Extraordinario" variant="outlined" sx={{ mt: 0.5 }} />}
                  </TableCell>
                  <TableCell>{categoria(c.id_categoria)}</TableCell>
                  <TableCell align="right">{clp(c.monto_por_unidad)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={cobrables ? (pagadas / cobrables) * 100 : 0} color="success" sx={{ flex: 1, height: 5, borderRadius: 1.5, bgcolor: 'divider' }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{pagadas}/{cobrables}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{clp(recaudado)}</TableCell>
                  <TableCell>{fecha(c.fecha_vencimiento)}</TableCell>
                  {gestiona && (
                    <TableCell align="right">
                      <Tooltip title="Editar cobro">
                        <IconButton size="small" onClick={() => setEditando(c)} aria-label={`Editar ${c.concepto}`}><EditarIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {cobros.length === 0 && (
              <TableRow><TableCell colSpan={gestiona ? 7 : 6}><Typography color="text.secondary" sx={{ py: 2 }}>Todavía no hay cobros. Crea el primero con «Nuevo cobro».</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Tarjeta titulo="Correos enviados" sx={{ maxWidth: 720 }}>
        {correosEnviados.length === 0 ? (
          <Typography color="text.secondary">Todavía no se envían correos en esta comunidad. Se envían solos al crear un cobro.</Typography>
        ) : (
          <Box sx={{ display: 'grid' }}>
            {correosEnviados.map((n, i) => (
              <Box key={n.id_correo} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 2, py: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{n.tipo === 'Nuevo cobro' ? `Nuevo cobro: ${n.asunto}` : n.tipo}</Typography>
                  <Typography variant="body2" color="text.secondary">{n.destinatarios} unidades</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{fechaHora(n.fecha_envio)}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Tarjeta>

      <DialogoNuevoCobro open={nuevo} onClose={() => setNuevo(false)} />
      {editando && <DialogoEditarCobro key={editando.id_cobro} cobro={editando} onClose={() => setEditando(null)} />}
    </Box>
  );
}

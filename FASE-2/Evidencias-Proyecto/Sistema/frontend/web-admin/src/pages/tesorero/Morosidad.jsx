import { useState } from 'react';
import {
  Box, Button, ButtonBase, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { NotificationsActiveOutlined as RecordarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as finanzas from '../../api/finanzas';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { clp, fechaHora, nombreUnidad } from '../../utils/formato';
import { residentesDe } from '../../utils/finanzas';
import { esTesorero, gestionaFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoRecordatorio from '../../components/finanzas/DialogoRecordatorio';
import DialogoExencion from '../../components/finanzas/DialogoExencion';

// Unidades con cobros vencidos (GET finanzas/estado → `morosos`): un cobro está atrasado cuando sigue
// pendiente después de su fecha de vencimiento. La Presidencia lo ve en modo lectura.
export default function Morosidad() {
  const { comunidad, cargo } = useSesion();
  const gestiona = gestionaFinanzas(cargo, comunidad);
  const estado = useConsulta(finanzas.estado, [comunidad.idRed]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const [idUnidad, setIdUnidad] = useState(null);
  const [recordatorio, setRecordatorio] = useState(false);
  const [exencion, setExencion] = useState(null);
  const e = estado.datos;

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Morosidad"
      descripcion={!e ? 'Unidades con cobros vencidos.' : e.morosos.length
        ? `${e.morosos.length} ${e.morosos.length === 1 ? 'unidad debe' : 'unidades deben'} ${clp(e.resumen.deudaMorosa)} en cobros vencidos.${e.ultimoRecordatorio ? ` Último recordatorio: ${fechaHora(e.ultimoRecordatorio.fecha)}.` : ''}`
        : 'Ninguna unidad tiene cobros vencidos.'}
      acciones={gestiona && e?.morosos.length > 0 && (
        <Button variant="contained" startIcon={<RecordarIcon />} onClick={() => setRecordatorio(true)}>
          Recordar a {e.morosos.length === 1 ? 'la unidad' : `las ${e.morosos.length} unidades`}
        </Button>
      )}
    />
  );
  if (!e || !unidades.datos) {
    return (
      <Box sx={{ maxWidth: 1200 }}>
        {encabezado}
        <EstadoCarga cargando error={estado.error ?? unidades.error} onReintentar={() => { estado.recargar(); unidades.recargar(); }} />
      </Box>
    );
  }

  const unidadPorId = Object.fromEntries(unidades.datos.map((u) => [u.idUnidad, u]));
  const estados = Object.fromEntries(e.unidades.map((u) => [u.idUnidad, u.estado]));
  // La fila de `morosos` trae número y calle; la unidad completa (tipo, residentes) viene de GET unidades
  const morosos = e.morosos.map((m) => ({ ...m, unidad: unidadPorId[m.idUnidad] ?? { ...m, ocupantes: [] } }));
  const unidad = idUnidad ? unidadPorId[idUnidad] : null;
  const quien = (u) => residentesDe(u) || nombreUnidad(u);

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {encabezado}

      {morosos.length > 0 && (
        <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
          {morosos.map((m, i) => (
            <ButtonBase key={m.idUnidad} onClick={() => setIdUnidad(m.idUnidad)} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', width: '100%', textAlign: 'left', px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', '&:active': { bgcolor: 'action.hover' } }}>
              <PlacaUnidad unidad={m.unidad} size="sm" />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{quien(m.unidad)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>{clp(m.deudaAtrasada)}</Box> vencido · {clp(m.pendienteNoVencido)} por vencer
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{clp(m.total)}</Typography>
            </ButtonBase>
          ))}
        </Paper>
      )}

      {morosos.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
          <Table sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unidad</TableCell>
                <TableCell align="right">Cobros vencidos</TableCell>
                <TableCell align="right">Deuda vencida</TableCell>
                <TableCell align="right">Por vencer</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {morosos.map((m) => (
                <TableRow key={m.idUnidad} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PlacaUnidad unidad={m.unidad} size="sm" />
                      <Typography sx={{ fontWeight: 700 }}>{quien(m.unidad)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{m.cobrosAtrasados}</TableCell>
                  <TableCell align="right" sx={{ color: 'error.main', fontWeight: 700 }}>{clp(m.deudaAtrasada)}</TableCell>
                  <TableCell align="right">{clp(m.pendienteNoVencido)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>{clp(m.total)}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => setIdUnidad(m.idUnidad)}>{gestiona ? 'Registrar pago' : 'Ver detalle'}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {unidad && (
        <DialogoUnidad
          key={unidad.idUnidad} unidad={unidad} estado={estados[unidad.idUnidad]} gestiona={gestiona} pideExencion={esTesorero(cargo)}
          onExencion={(c) => { setExencion({ idUnidad: unidad.idUnidad, idCobroUnidad: c.idCobroUnidad }); setIdUnidad(null); }}
          onClose={() => setIdUnidad(null)} onCambio={estado.recargar}
        />
      )}
      {recordatorio && <DialogoRecordatorio estado={e} onClose={() => setRecordatorio(false)} onEnviado={estado.recargar} />}
      {exencion && <DialogoExencion unidades={unidades.datos} inicial={exencion} onClose={() => setExencion(null)} onSolicitada={estado.recargar} />}
    </Box>
  );
}

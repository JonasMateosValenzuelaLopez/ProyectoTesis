import { useState } from 'react';
import {
  Box, Button, Chip, Paper, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { residentes } from '../../data/finanzasMock';
import { clp, fecha } from '../../utils/formato';
import { esPresidente } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import DialogoExencion from '../../components/finanzas/DialogoExencion';

const ESTADO = {
  pendiente: { texto: 'En revisión', color: 'warning' },
  aprobada: { texto: 'Aprobada', color: 'success' },
  rechazada: { texto: 'Rechazada', color: 'error' },
};

export default function Exenciones() {
  const { comunidad, cargo } = useSesion();
  const { datos, unidadPorId, acciones } = useFinanzas();
  const [pestana, setPestana] = useState('pendiente');
  const [solicitar, setSolicitar] = useState(false);
  const presidente = esPresidente(cargo);
  const cobro = (id) => datos.cobros.find((c) => c.id === id);
  const lista = datos.exenciones.filter((e) => (pestana === 'pendiente' ? e.estado === 'pendiente' : e.estado !== 'pendiente'));

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Exenciones"
        descripcion={presidente
          ? 'Tesorería solicita las exenciones y tú decides. Al aprobar, el cobro de esa unidad queda exento.'
          : 'Una exención se aplica solo cuando el Presidente la aprueba. Mientras está en revisión, el cobro sigue vigente.'}
        acciones={cargo === 'tesorero' && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSolicitar(true)}>Solicitar exención</Button>}
      />

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}>
        <Tab value="pendiente" label={`En revisión (${datos.exenciones.filter((e) => e.estado === 'pendiente').length})`} />
        <Tab value="resueltas" label="Resueltas" />
      </Tabs>

      {lista.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Typography color="text.secondary">{pestana === 'pendiente' ? 'No hay exenciones esperando revisión.' : 'Todavía no hay exenciones resueltas.'}</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
          <Table sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>Unidad</TableCell>
                <TableCell>Cobro</TableCell>
                <TableCell>Motivo</TableCell>
                <TableCell>Solicitada</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lista.map((e) => {
                const u = unidadPorId[e.idUnidad];
                const c = cobro(e.idCobro);
                return (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <PlacaUnidad tipo={u.tipo} numero={u.numero} size="sm" />
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{residentes[u.id] ?? `${u.tipo} ${u.numero}`}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{c?.concepto}<Typography variant="body2" color="text.secondary">{c && clp(c.montoPorUnidad)}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>{e.motivo}</TableCell>
                    <TableCell>{fecha(e.fecha)}<Typography variant="body2" color="text.secondary">{e.solicitadaPor}</Typography></TableCell>
                    <TableCell>
                      {presidente && e.estado === 'pendiente' ? (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button size="small" variant="contained" onClick={() => acciones.resolverExencion(e.id, true)}>Aprobar</Button>
                          <Button size="small" color="inherit" onClick={() => acciones.resolverExencion(e.id, false)}>Rechazar</Button>
                        </Box>
                      ) : (
                        <>
                          <Chip size="small" label={ESTADO[e.estado].texto} sx={{ bgcolor: `${ESTADO[e.estado].color}.light`, color: `${ESTADO[e.estado].color}.main` }} />
                          {e.resueltaPor && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{e.resueltaPor} · {fecha(e.resueltaEn)}</Typography>}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <DialogoExencion open={solicitar} onClose={() => setSolicitar(false)} />
    </Box>
  );
}

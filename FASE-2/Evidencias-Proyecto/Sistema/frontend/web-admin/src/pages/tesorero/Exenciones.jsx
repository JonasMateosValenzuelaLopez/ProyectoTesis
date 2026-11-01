import { useState } from 'react';
import {
  Box, Button, Chip, Paper, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { residentes } from '../../data/finanzasMock';
import { clp, fecha, nombreUnidad } from '../../utils/formato';
import { esPresidente } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import DialogoExencion from '../../components/finanzas/DialogoExencion';

const ESTADO = {
  Pendiente: { texto: 'En revisión', color: 'warning' },
  Aprobada: { texto: 'Aprobada', color: 'success' },
  Rechazada: { texto: 'Rechazada', color: 'error' },
};

export default function Exenciones() {
  const { comunidad, cargo } = useSesion();
  const { datos, unidadPorId, gastoPorId, cobroPorId, nombreUsuario, acciones } = useFinanzas();
  const [pestana, setPestana] = useState('pendiente');
  const [solicitar, setSolicitar] = useState(false);
  const presidente = esPresidente(cargo);
  // La exención apunta a un gasto (`id_gasto`); de él salen la unidad y el cobro
  const detalle = (e) => {
    const g = gastoPorId[e.id_gasto];
    return { u: unidadPorId[g.id_unidad], g, concepto: cobroPorId[g.id_cobro]?.concepto ?? g.descripcion };
  };
  const lista = datos.exenciones.filter((e) => (pestana === 'pendiente' ? e.estado === 'Pendiente' : e.estado !== 'Pendiente'));

  // Lo que va en la columna Estado: los botones si le toca decidir al Presidente, o cómo terminó.
  const decision = (e) => (presidente && e.estado === 'Pendiente' ? (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button size="small" variant="contained" onClick={() => acciones.resolverExencion(e.id_exencion, true)}>Aprobar</Button>
      <Button size="small" color="inherit" onClick={() => acciones.resolverExencion(e.id_exencion, false)}>Rechazar</Button>
    </Box>
  ) : (
    <>
      <Chip size="small" label={ESTADO[e.estado].texto} sx={{ bgcolor: `${ESTADO[e.estado].color}.light`, color: `${ESTADO[e.estado].color}.main` }} />
      {e.id_resuelve && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{nombreUsuario(e.id_resuelve)} · {fecha(e.fecha_resolucion)}</Typography>}
    </>
  ));

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Exenciones"
        descripcion={presidente
          ? 'Tesorería solicita las exenciones y tú decides. Al aprobar, el cobro de esa unidad queda exento.'
          : 'Una exención se aplica solo cuando la Presidencia la aprueba. Mientras está en revisión, el cobro sigue vigente.'}
        acciones={cargo === 'tesorero' && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setSolicitar(true)}>Solicitar exención</Button>}
      />

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }}>
        <Tab value="pendiente" label={`En revisión (${datos.exenciones.filter((e) => e.estado === 'Pendiente').length})`} />
        <Tab value="resueltas" label="Resueltas" />
      </Tabs>

      {lista.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
          <Typography color="text.secondary">{pestana === 'pendiente' ? 'No hay exenciones esperando revisión.' : 'Todavía no hay exenciones resueltas.'}</Typography>
        </Paper>
      ) : (
        <>
          {/* En el celular cada exención es un bloque con su decisión abajo; la tabla queda para pantallas anchas */}
          <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.map((e, i) => {
              const { u, g, concepto } = detalle(e);
              return (
                <Box key={e.id_exencion} sx={{ px: 2, py: 1.5, display: 'grid', gap: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <PlacaUnidad unidad={u} size="sm" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{residentes[u.id_unidad] ?? nombreUnidad(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">{concepto} · {clp(g.monto_total)}</Typography>
                    </Box>
                  </Box>
                  <Typography>«{e.motivo}»</Typography>
                  <Typography variant="body2" color="text.secondary">Solicitada por {nombreUsuario(e.id_solicitante)} · {fecha(e.fecha_solicitud)}</Typography>
                  <Box>{decision(e)}</Box>
                </Box>
              );
            })}
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Cobro</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Solicitada</TableCell>
                  <TableCell>{presidente && pestana === 'pendiente' ? 'Decisión' : 'Estado'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.map((e) => {
                  const { u, g, concepto } = detalle(e);
                  return (
                    <TableRow key={e.id_exencion}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <PlacaUnidad unidad={u} size="sm" />
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{residentes[u.id_unidad] ?? nombreUnidad(u)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{concepto}<Typography variant="body2" color="text.secondary">{clp(g.monto_total)}</Typography></TableCell>
                      <TableCell sx={{ maxWidth: 320 }}>{e.motivo}</TableCell>
                      <TableCell>{fecha(e.fecha_solicitud)}<Typography variant="body2" color="text.secondary">{nombreUsuario(e.id_solicitante)}</Typography></TableCell>
                      <TableCell>
                        {decision(e)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <DialogoExencion open={solicitar} onClose={() => setSolicitar(false)} />
    </Box>
  );
}

import { useState } from 'react';
import {
  Box, Button, Chip, Link, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as finanzas from '../../api/finanzas';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { clp, fecha } from '../../utils/formato';
import { ESTADO_VISADO } from '../../utils/finanzas';
import { esPresidente, gestionaFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import EstadoCarga from '../../components/ui/EstadoCarga';
import DialogoEgreso from '../../components/finanzas/DialogoEgreso';
import DialogoDecision from '../../components/finanzas/DialogoDecision';

const EstadoVisado = ({ egreso }) => {
  const e = ESTADO_VISADO[egreso.estadoVisado] ?? { texto: egreso.estadoVisado, color: 'info' };
  return <Chip size="small" label={e.texto} sx={{ bgcolor: `${e.color}.light`, color: `${e.color}.main` }} />;
};

// Gastos pagados con la plata de la comunidad (GET/POST finanzas/egresos). Los que llegan al umbral de visado
// esperan a la Presidencia; los rechazados no cuentan en los reportes.
export default function Egresos() {
  const { comunidad, cargo } = useSesion();
  const gestiona = gestionaFinanzas(cargo, comunidad);
  const presidente = esPresidente(cargo);
  const egresos = useConsulta(finanzas.listarEgresos, [comunidad.idRed]);
  const categorias = useConsulta(() => (gestiona ? finanzas.listarCategorias() : Promise.resolve([])), [comunidad.idRed, gestiona]);
  const datos = useConsulta(admin.datosComunidad, [comunidad.idRed]);
  const [filtro, setFiltro] = useState('todos');
  const [registrar, setRegistrar] = useState(false);
  const [decision, setDecision] = useState(null);
  const umbral = datos.datos?.umbralVisado ?? null;

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Egresos"
      descripcion={umbral != null
        ? `Los gastos de ${clp(umbral)} o más necesitan el visado de la Presidencia antes de contar en los reportes.`
        : 'Gastos pagados con los fondos de la comunidad.'}
      acciones={gestiona && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRegistrar(true)} disabled={!categorias.datos}>Registrar egreso</Button>}
    />
  );
  if (!egresos.datos) {
    return <Box sx={{ maxWidth: 1300 }}>{encabezado}<EstadoCarga cargando={egresos.cargando} error={egresos.error} onReintentar={egresos.recargar} /></Box>;
  }

  const todos = egresos.datos;
  const validos = todos.filter((e) => e.estadoVisado === 'No requiere' || e.estadoVisado === 'Aprobado');
  const porVisar = todos.filter((e) => e.estadoVisado === 'Pendiente');
  const lista = filtro === 'porVisar' ? porVisar : filtro === 'rechazados' ? todos.filter((e) => e.estadoVisado === 'Rechazado') : todos;
  const visar = (e, aprobado) => setDecision({
    titulo: aprobado ? 'Visar egreso' : 'Rechazar egreso',
    detalle: `${e.descripcion} · ${clp(e.monto)}${aprobado ? '. Contará en los reportes.' : '. No contará en los reportes.'}`,
    aprobado, etiqueta: aprobado ? 'Visar' : 'Rechazar',
    mensaje: aprobado ? 'Egreso visado.' : 'Egreso rechazado.',
    hacer: (comentario) => finanzas.visarEgreso(e.idEgreso, aprobado, comentario),
  });
  const acciones = (e) => (presidente && e.estadoVisado === 'Pendiente' ? (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button size="small" variant="contained" onClick={() => visar(e, true)}>Visar</Button>
      <Button size="small" color="inherit" onClick={() => visar(e, false)}>Rechazar</Button>
    </Box>
  ) : <EstadoVisado egreso={e} />);
  const detalle = (e) => [e.categoria?.nombre ?? 'Sin categoría', e.proveedor, `registrado por ${e.creadoPor?.nombre ?? 'sin nombre'}`].filter(Boolean).join(' · ');
  const comprobante = (e) => e.comprobanteUrl && <Link href={e.comprobanteUrl} target="_blank" rel="noopener noreferrer" variant="body2">Ver comprobante</Link>;

  return (
    <Box sx={{ maxWidth: 1300 }}>
      {encabezado}
      <FranjaKpi items={[
        { etiqueta: 'Egresos válidos', valor: clp(validos.reduce((s, e) => s + e.monto, 0)), nota: `${validos.length} registrados` },
        { etiqueta: 'Esperando visado', valor: porVisar.length, color: porVisar.length ? 'warning.main' : undefined, nota: porVisar.length ? clp(porVisar.reduce((s, e) => s + e.monto, 0)) : undefined },
      ]} />

      <ToggleButtonGroup size="small" exclusive value={filtro} onChange={(_, v) => v && setFiltro(v)} sx={{ mb: 2 }}>
        <ToggleButton value="todos">Todos</ToggleButton>
        <ToggleButton value="porVisar">Esperando visado ({porVisar.length})</ToggleButton>
        <ToggleButton value="rechazados">Rechazados</ToggleButton>
      </ToggleButtonGroup>

      {lista.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
          <Typography color="text.secondary">{todos.length ? 'Ningún egreso en este filtro.' : 'Todavía no hay egresos registrados.'}</Typography>
        </Paper>
      ) : (
        <>
          <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.map((e, i) => (
              <Box key={e.idEgreso} sx={{ px: 2, py: 1.5, display: 'grid', gap: 0.75, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline' }}>
                  <Typography sx={{ fontWeight: 700 }}>{e.descripcion}</Typography>
                  <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{clp(e.monto)}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{fecha(e.fechaEgreso)} · {detalle(e)}</Typography>
                {comprobante(e)}
                <Box>{acciones(e)}</Box>
              </Box>
            ))}
          </Paper>
          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="right">Monto</TableCell>
                  <TableCell>Visado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.map((e) => (
                  <TableRow key={e.idEgreso} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fecha(e.fechaEgreso)}</TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{e.descripcion}</Typography>
                      <Typography variant="body2" color="text.secondary">{[e.proveedor, `registrado por ${e.creadoPor?.nombre ?? 'sin nombre'}`].filter(Boolean).join(' · ')}</Typography>
                      {comprobante(e)}
                    </TableCell>
                    <TableCell>{e.categoria?.nombre ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{clp(e.monto)}</TableCell>
                    <TableCell>
                      {acciones(e)}
                      {e.visadoPor && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{e.visadoPor.nombre} · {fecha(e.visadoEn)}</Typography>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {registrar && (
        <DialogoEgreso
          categorias={(categorias.datos ?? []).filter((c) => c.activa)} umbralVisado={umbral}
          onClose={() => setRegistrar(false)} onRegistrado={egresos.recargar}
        />
      )}
      {decision && <DialogoDecision decision={decision} onClose={() => setDecision(null)} onHecho={egresos.recargar} />}
    </Box>
  );
}

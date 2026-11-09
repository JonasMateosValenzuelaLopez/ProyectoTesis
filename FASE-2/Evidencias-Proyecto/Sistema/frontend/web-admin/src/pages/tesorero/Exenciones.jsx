import { useState } from 'react';
import {
  Box, Button, Chip, Paper, Tab, Tabs, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as finanzas from '../../api/finanzas';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { clp, fecha, nombreUnidad } from '../../utils/formato';
import { ESTADO_EXENCION } from '../../utils/finanzas';
import { esPresidente, esTesorero } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import DialogoExencion from '../../components/finanzas/DialogoExencion';
import DialogoDecision from '../../components/finanzas/DialogoDecision';

// Exenciones en dos etapas (exenciones.service.ts):
// 1. Un residente la pide desde la app (nace «Pendiente») y Tesorería la acepta o rechaza. Si Tesorería la pide, salta esta etapa.
// 2. La Presidencia decide las «Por aprobar». Al aprobar, el cobro de esa unidad queda exento.
export default function Exenciones() {
  const { comunidad, cargo } = useSesion();
  const tesorero = esTesorero(cargo);
  const presidente = esPresidente(cargo);
  const exenciones = useConsulta(finanzas.listarExenciones, [comunidad.idRed]);
  const unidades = useConsulta(() => (tesorero ? admin.listarUnidades() : Promise.resolve([])), [comunidad.idRed, tesorero]);
  const [pestana, setPestana] = useState(presidente ? 'Por aprobar' : 'Pendiente');
  const [pedir, setPedir] = useState(false);
  const [decision, setDecision] = useState(null);

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Exenciones"
      descripcion={presidente
        ? 'Tesorería revisa las solicitudes y tú decides. Al aprobar, el cobro de esa unidad queda exento.'
        : 'Revisa las que piden los residentes desde la app. Se aplican solo cuando la Presidencia las aprueba; mientras tanto, el cobro sigue vigente.'}
      acciones={tesorero && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setPedir(true)} disabled={!unidades.datos}>Pedir exención</Button>}
    />
  );
  if (!exenciones.datos) {
    return <Box sx={{ maxWidth: 1200 }}>{encabezado}<EstadoCarga cargando={exenciones.cargando} error={exenciones.error} onReintentar={exenciones.recargar} /></Box>;
  }

  const todas = exenciones.datos;
  const cuenta = (estado) => todas.filter((e) => e.estado === estado).length;
  const lista = pestana === 'Resueltas' ? todas.filter((e) => e.estado === 'Aprobada' || e.estado === 'Rechazada') : todas.filter((e) => e.estado === pestana);
  const unidadDe = (e) => ({ tipo: comunidad.tipo === 'Edificio' ? 'Departamento' : 'Casa', numeroIdentificador: e.unidad?.numeroIdentificador ?? '?' });

  // Quién actúa en cada etapa: Tesorería revisa las «Pendiente», la Presidencia resuelve las «Por aprobar»
  const decidir = (e, aprobado) => {
    const unidad = nombreUnidad(unidadDe(e));
    if (e.estado === 'Pendiente') {
      setDecision({
        titulo: aprobado ? 'Aceptar y enviar a Presidencia' : 'Rechazar solicitud',
        detalle: aprobado
          ? `La exención de «${e.concepto}» (${unidad}) pasa a la Presidencia, que decide si se aplica.`
          : `Se rechaza la exención de «${e.concepto}» (${unidad}). El cobro sigue vigente.`,
        aprobado, etiqueta: aprobado ? 'Enviar a Presidencia' : 'Rechazar',
        mensaje: aprobado ? 'Exención enviada a la Presidencia.' : 'Solicitud rechazada.',
        hacer: (comentario) => finanzas.revisarExencion(e.idExencion, aprobado, comentario),
      });
    } else {
      setDecision({
        titulo: aprobado ? 'Aprobar exención' : 'Rechazar exención',
        detalle: aprobado
          ? `«${e.concepto}» de ${unidad} (${clp(e.monto)}) queda exento: la unidad ya no lo debe.`
          : `«${e.concepto}» de ${unidad} sigue vigente.`,
        aprobado, etiqueta: aprobado ? 'Aprobar' : 'Rechazar',
        mensaje: aprobado ? 'Exención aprobada. El cobro quedó exento.' : 'Exención rechazada.',
        hacer: (comentario) => finanzas.resolverExencion(e.idExencion, aprobado, comentario),
      });
    }
  };
  const leToca = (e) => (tesorero && e.estado === 'Pendiente') || (presidente && e.estado === 'Por aprobar');

  // Lo que va en la columna Estado: los botones si le toca decidir, o cómo va
  const columnaEstado = (e) => (leToca(e) ? (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button size="small" variant="contained" onClick={() => decidir(e, true)}>{e.estado === 'Pendiente' ? 'Aceptar' : 'Aprobar'}</Button>
      <Button size="small" color="inherit" onClick={() => decidir(e, false)}>Rechazar</Button>
    </Box>
  ) : (
    <>
      <Chip size="small" label={ESTADO_EXENCION[e.estado]?.texto ?? e.estado} sx={{ bgcolor: `${ESTADO_EXENCION[e.estado]?.color ?? 'info'}.light`, color: `${ESTADO_EXENCION[e.estado]?.color ?? 'info'}.main` }} />
      {(e.resueltaPor ?? e.revisadaPor) && (e.estado === 'Aprobada' || e.estado === 'Rechazada') && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {(e.resueltaPor ?? e.revisadaPor).nombre} · {fecha(e.resueltaEn ?? e.revisadaEn)}
        </Typography>
      )}
      {e.comentarioResolucion && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>«{e.comentarioResolucion}»</Typography>}
    </>
  ));
  const solicitada = (e) => `${e.solicitadaPor?.nombre ?? 'Sin nombre'} · ${fecha(e.fechaSolicitud)}`;

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {encabezado}

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="Pendiente" label={`Revisión de Tesorería (${cuenta('Pendiente')})`} />
        <Tab value="Por aprobar" label={`Decisión de Presidencia (${cuenta('Por aprobar')})`} />
        <Tab value="Resueltas" label="Resueltas" />
      </Tabs>

      {lista.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
          <Typography color="text.secondary">
            {pestana === 'Pendiente' ? 'Ninguna solicitud de residentes espera revisión.' : pestana === 'Por aprobar' ? 'Ninguna exención espera la decisión de la Presidencia.' : 'Todavía no hay exenciones resueltas.'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* En el celular cada exención es un bloque con su decisión abajo; la tabla queda para pantallas anchas */}
          <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.map((e, i) => (
              <Box key={e.idExencion} sx={{ px: 2, py: 1.5, display: 'grid', gap: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <PlacaUnidad unidad={unidadDe(e)} size="sm" />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{e.concepto}</Typography>
                    <Typography variant="body2" color="text.secondary">{clp(e.monto)}</Typography>
                  </Box>
                </Box>
                <Typography>«{e.motivo}»</Typography>
                <Typography variant="body2" color="text.secondary">Pedida por {solicitada(e)}</Typography>
                <Box>{columnaEstado(e)}</Box>
              </Box>
            ))}
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Cobro</TableCell>
                  <TableCell>Motivo</TableCell>
                  <TableCell>Pedida</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.map((e) => (
                  <TableRow key={e.idExencion}>
                    <TableCell><PlacaUnidad unidad={unidadDe(e)} size="sm" /></TableCell>
                    <TableCell>{e.concepto}<Typography variant="body2" color="text.secondary">{clp(e.monto)}</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>{e.motivo}</TableCell>
                    <TableCell>{fecha(e.fechaSolicitud)}<Typography variant="body2" color="text.secondary">{e.solicitadaPor?.nombre}</Typography></TableCell>
                    <TableCell>{columnaEstado(e)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {pedir && <DialogoExencion unidades={unidades.datos} onClose={() => setPedir(false)} onSolicitada={() => { exenciones.recargar(); setPestana('Por aprobar'); }} />}
      {decision && <DialogoDecision decision={decision} onClose={() => setDecision(null)} onHecho={exenciones.recargar} />}
    </Box>
  );
}

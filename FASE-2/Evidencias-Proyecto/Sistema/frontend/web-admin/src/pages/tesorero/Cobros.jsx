import { useState } from 'react';
import {
  Alert, Box, Button, Chip, IconButton, LinearProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material';
import { Add as AddIcon, EditOutlined as EditarIcon, NotificationsActiveOutlined as RecordarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as finanzas from '../../api/finanzas';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { clp, fecha, nombreUnidad } from '../../utils/formato';
import { nombrePeriodo } from '../../utils/finanzas';
import { esTesorero, gestionaFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';
import DialogoEditarCobro from '../../components/finanzas/DialogoEditarCobro';
import DialogoRecordatorio from '../../components/finanzas/DialogoRecordatorio';
import DialogoExencion from '../../components/finanzas/DialogoExencion';

// Texto solo para lectores de pantalla (encabezado de la columna de acciones)
const visualmenteOculto = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' };

// Avance de un cobro con sus `totales` (las exentas no se cobran)
const avance = (c) => {
  const cobrables = c.totales.unidades - c.totales.exentas;
  return { pagadas: c.totales.pagadas, cobrables, porcentaje: cobrables ? (c.totales.pagadas / cobrables) * 100 : 0 };
};

function BarraAvance({ cobro }) {
  const { pagadas, cobrables, porcentaje } = avance(cobro);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress variant="determinate" value={porcentaje} color="success" sx={{ flex: 1, height: 5, borderRadius: 1.5, bgcolor: 'divider' }} />
      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{pagadas}/{cobrables}</Typography>
    </Box>
  );
}

// Cobros de la comunidad (Tesorería y Administración). La plataforma no recibe pagos: llegan por transferencia o en
// efectivo y se marcan aquí. El plano muestra el estado de cada unidad en el mes (GET finanzas/estado).
export default function Cobros() {
  const { comunidad, cargo } = useSesion();
  const gestiona = gestionaFinanzas(cargo, comunidad);
  const estado = useConsulta(finanzas.estado, [comunidad.idRed]);
  const cobros = useConsulta(finanzas.listarCobros, [comunidad.idRed]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const categorias = useConsulta(() => (gestiona ? finanzas.listarCategorias() : Promise.resolve([])), [comunidad.idRed, gestiona]);
  const [idUnidad, setIdUnidad] = useState(null);
  const [nuevo, setNuevo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [recordatorio, setRecordatorio] = useState(false);
  const [exencion, setExencion] = useState(null);

  const recargarTodo = () => { estado.recargar(); cobros.recargar(); };
  const e = estado.datos;
  const periodo = nombrePeriodo(e?.periodo);

  const encabezado = (
    <Encabezado
      contexto={periodo ? `${comunidad.nombre} · ${periodo}` : comunidad.nombre}
      titulo="Cobros"
      descripcion="Cada cobro se crea por categoría y envía un correo a las unidades. La plataforma no recibe pagos: se marcan cuando llega la transferencia."
      acciones={gestiona && (
        <>
          <Button variant="outlined" color="inherit" startIcon={<RecordarIcon />} onClick={() => setRecordatorio(true)} disabled={!e || e.morosos.length === 0}>
            Recordar a morosos{e ? ` (${e.morosos.length})` : ''}
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevo(true)} disabled={!categorias.datos || !unidades.datos}>Nuevo cobro</Button>
        </>
      )}
    />
  );
  const fallo = estado.error ?? cobros.error ?? unidades.error;
  if (!e || !cobros.datos || !unidades.datos) {
    return (
      <Box sx={{ maxWidth: 1400 }}>
        {encabezado}
        <EstadoCarga cargando error={fallo} onReintentar={() => { recargarTodo(); unidades.recargar(); }} />
      </Box>
    );
  }

  const listaUnidades = unidades.datos;
  const estados = Object.fromEntries(e.unidades.map((u) => [u.idUnidad, u.estado]));
  const unidadPorId = Object.fromEntries(listaUnidades.map((u) => [u.idUnidad, u]));
  // Unidades cuyo residente avisó una transferencia desde la app
  const conAviso = [...new Set(e.avisosPorValidar.map((a) => a.idUnidad))].map((id) => unidadPorId[id]).filter(Boolean);
  const unidad = idUnidad ? unidadPorId[idUnidad] : null;
  const { resumen } = e;
  const lista = cobros.datos;
  const activas = (categorias.datos ?? []).filter((c) => c.activa);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      {encabezado}

      <FranjaKpi
        items={[
          { etiqueta: `Al día en ${periodo}`, valor: `${resumen.alDia} de ${resumen.totalUnidades}`, progreso: resumen.totalUnidades ? (resumen.alDia / resumen.totalUnidades) * 100 : 0 },
          { etiqueta: 'Recaudado del mes', valor: clp(resumen.recaudado), nota: `de ${clp(resumen.esperado)}` },
          { etiqueta: 'Deuda vencida', valor: clp(resumen.deudaMorosa), color: resumen.deudaMorosa ? 'error.main' : undefined, nota: `${e.morosos.length} ${e.morosos.length === 1 ? 'unidad' : 'unidades'}` },
          { etiqueta: 'Transferencias por validar', valor: resumen.avisosPorValidar, color: resumen.avisosPorValidar ? 'warning.main' : undefined },
        ]}
      />

      {conAviso.length > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2.5, alignItems: 'center' }}>
          {conAviso.length === 1 ? 'Una unidad avisó' : `${conAviso.length} unidades avisaron`} una transferencia desde la app. Revisa que llegó y valídala:
          {conAviso.map((u) => (
            <Button key={u.idUnidad} size="small" variant="outlined" color="inherit" onClick={() => setIdUnidad(u.idUnidad)} sx={{ ml: 1 }}>{nombreUnidad(u)}</Button>
          ))}
        </Alert>
      )}

      <Tarjeta titulo={`Plano de pagos · ${periodo}`} extra={gestiona ? 'Toca una unidad para marcar sus pagos' : 'Toca una unidad para ver su cuenta'} sx={{ mb: 2.5 }}>
        <PlanoComunidad comunidad={{ tipo: comunidad.tipo, unidades: listaUnidades }} estados={estados} onSelect={(u) => setIdUnidad(u.idUnidad)} />
        <LeyendaPlano />
      </Tarjeta>

      {/* En el celular cada cobro es un bloque; la tabla queda para pantallas anchas */}
      <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
        {lista.map((c, i) => (
          <Box key={c.idCobro} sx={{ px: 2, py: 1.5, display: 'grid', gap: 0.75, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'baseline' }}>
              <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
              <Typography sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{clp(c.montoPorUnidad)}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {c.categoria?.nombre ?? 'Sin categoría'}{c.extraordinario ? ' · extraordinario' : ''} · {nombrePeriodo(c.periodo)} · vence {fecha(c.fechaVencimiento)}
            </Typography>
            <BarraAvance cobro={c} />
            <Typography variant="body2">Recaudado {clp(c.totales.recaudado)} de {clp(c.totales.esperado)}</Typography>
            {gestiona && (
              <Box><Button size="small" startIcon={<EditarIcon />} onClick={() => setEditando(c)} aria-label={`Editar ${c.concepto}`}>Editar</Button></Box>
            )}
          </Box>
        ))}
        {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Todavía no hay cobros. Crea el primero con «Nuevo cobro».</Typography>}
      </Paper>

      <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
        <Table sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Concepto</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Periodo</TableCell>
              <TableCell align="right">Por unidad</TableCell>
              <TableCell sx={{ width: 170 }}>Pagadas</TableCell>
              <TableCell align="right">Recaudado</TableCell>
              <TableCell>Vence</TableCell>
              {gestiona && <TableCell align="right" sx={{ width: 64 }}><Box component="span" sx={visualmenteOculto}>Acciones</Box></TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.map((c) => (
              <TableRow key={c.idCobro} hover>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                  {c.extraordinario && <Chip size="small" label="Extraordinario" variant="outlined" sx={{ mt: 0.5 }} />}
                </TableCell>
                <TableCell>{c.categoria?.nombre ?? '—'}</TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{nombrePeriodo(c.periodo)}</TableCell>
                <TableCell align="right">{clp(c.montoPorUnidad)}</TableCell>
                <TableCell><BarraAvance cobro={c} /></TableCell>
                <TableCell align="right">{clp(c.totales.recaudado)}</TableCell>
                <TableCell>{fecha(c.fechaVencimiento)}</TableCell>
                {gestiona && (
                  <TableCell align="right">
                    <Tooltip title="Editar o eliminar">
                      <IconButton size="small" onClick={() => setEditando(c)} aria-label={`Editar ${c.concepto}`}><EditarIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={gestiona ? 8 : 7}><Typography color="text.secondary" sx={{ py: 2 }}>Todavía no hay cobros. Crea el primero con «Nuevo cobro».</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {unidad && (
        <DialogoUnidad
          key={unidad.idUnidad} unidad={unidad} estado={estados[unidad.idUnidad]} gestiona={gestiona} pideExencion={esTesorero(cargo)}
          onExencion={(c) => { setExencion({ idUnidad: unidad.idUnidad, idCobroUnidad: c.idCobroUnidad }); setIdUnidad(null); }}
          onClose={() => setIdUnidad(null)} onCambio={recargarTodo}
        />
      )}
      {nuevo && <DialogoNuevoCobro categorias={activas} totalUnidades={listaUnidades.length} onClose={() => setNuevo(false)} onCreado={recargarTodo} />}
      {editando && <DialogoEditarCobro key={editando.idCobro} cobro={editando} onClose={() => setEditando(null)} onCambio={recargarTodo} />}
      {recordatorio && <DialogoRecordatorio estado={e} onClose={() => setRecordatorio(false)} onEnviado={estado.recargar} />}
      {exencion && <DialogoExencion unidades={listaUnidades} inicial={exencion} onClose={() => setExencion(null)} onSolicitada={recargarTodo} />}
    </Box>
  );
}

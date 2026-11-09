import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material';
import { Add as AddIcon, NotificationsActiveOutlined as RecordarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as admin from '../../api/admin';
import * as finanzas from '../../api/finanzas';
import { useConsulta } from '../../api/useConsulta';
import { tieneModulo } from '../../config/modulos';
import { clp, diasHasta, fecha, fechaHora, hoyTexto, nombreUnidad, saludo } from '../../utils/formato';
import { nombrePeriodo } from '../../utils/finanzas';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';
import DialogoRecordatorio from '../../components/finanzas/DialogoRecordatorio';
import DialogoExencion from '../../components/finanzas/DialogoExencion';

const nada = () => Promise.resolve(null);

// Inicio de Tesorería: el mes en curso (GET finanzas/estado), el plano de pagos, los cobros del periodo
// y las transferencias avisadas que hay que validar.
export default function InicioTesorero() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const conCobros = tieneModulo(comunidad, 'cobros');
  const estado = useConsulta(conCobros ? finanzas.estado : nada, [comunidad.idRed, conCobros]);
  const cobros = useConsulta(conCobros ? finanzas.listarCobros : nada, [comunidad.idRed, conCobros]);
  const categorias = useConsulta(conCobros ? finanzas.listarCategorias : nada, [comunidad.idRed, conCobros]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const [idUnidad, setIdUnidad] = useState(null);
  const [nuevoCobro, setNuevoCobro] = useState(false);
  const [recordatorio, setRecordatorio] = useState(false);
  const [exencion, setExencion] = useState(null);
  const recargarTodo = () => { estado.recargar(); cobros.recargar(); };

  const e = estado.datos;
  const encabezado = (
    <Encabezado
      contexto={`${comunidad.nombre} · ${hoyTexto()}`}
      titulo={`${saludo()}, ${usuario.nombre}`}
      acciones={e && (
        <>
          <Button variant="outlined" color="inherit" startIcon={<RecordarIcon />} onClick={() => setRecordatorio(true)} disabled={e.morosos.length === 0}>
            Recordar a morosos ({e.morosos.length})
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevoCobro(true)} disabled={!categorias.datos || !unidades.datos}>Nuevo cobro</Button>
        </>
      )}
    />
  );
  if (!conCobros) {
    return (
      <Box sx={{ maxWidth: 1400 }}>
        {encabezado}
        <Tarjeta titulo="Cobros desactivados"><Typography color="text.secondary">Esta comunidad no usa el módulo de cobros, así que Tesorería no tiene movimientos que llevar aquí.</Typography></Tarjeta>
      </Box>
    );
  }
  if (!e || !unidades.datos) {
    return <Box sx={{ maxWidth: 1400 }}>{encabezado}<EstadoCarga cargando error={estado.error ?? unidades.error} onReintentar={() => { estado.recargar(); unidades.recargar(); }} /></Box>;
  }

  const periodo = nombrePeriodo(e.periodo);
  const unidadPorId = Object.fromEntries(unidades.datos.map((u) => [u.idUnidad, u]));
  const estados = Object.fromEntries(e.unidades.map((u) => [u.idUnidad, u.estado]));
  const conAviso = [...new Set(e.avisosPorValidar.map((a) => a.idUnidad))].map((id) => unidadPorId[id]).filter(Boolean);
  const delPeriodo = (cobros.datos ?? []).filter((c) => c.periodo === e.periodo);
  const vencimiento = delPeriodo.map((c) => c.fechaVencimiento).sort()[0];
  const unidad = idUnidad ? unidadPorId[idUnidad] : null;

  return (
    <Box sx={{ maxWidth: 1400 }}>
      {encabezado}

      <FranjaKpi
        items={[
          { etiqueta: `Al día en ${periodo}`, valor: `${e.resumen.alDia} de ${e.resumen.totalUnidades}`, progreso: e.resumen.totalUnidades ? (e.resumen.alDia / e.resumen.totalUnidades) * 100 : 0 },
          { etiqueta: 'Deuda vencida', valor: clp(e.resumen.deudaMorosa), color: e.resumen.deudaMorosa ? 'error.main' : undefined, nota: `${e.morosos.length} ${e.morosos.length === 1 ? 'unidad' : 'unidades'}` },
          { etiqueta: 'Exenciones', valor: e.resumen.exencionesEnCurso, nota: 'en revisión' },
          { etiqueta: 'Vencimiento', valor: vencimiento ? fecha(vencimiento) : '—', nota: vencimiento ? (diasHasta(vencimiento) >= 0 ? `en ${diasHasta(vencimiento)} días` : 'ya venció') : undefined },
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

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, alignItems: 'start' }}>
        <Tarjeta titulo={`Plano de pagos · ${periodo}`} extra="Toca una unidad para marcar sus pagos">
          <PlanoComunidad comunidad={{ tipo: comunidad.tipo, unidades: unidades.datos }} estados={estados} onSelect={(u) => setIdUnidad(u.idUnidad)} />
          <LeyendaPlano />
        </Tarjeta>

        <Tarjeta titulo={`Cobros de ${periodo.split(' ')[0]}`} extra={<Button size="small" onClick={() => navigate('/panel/finanzas')}>Ver todos</Button>}>
          {delPeriodo.length === 0 && <Typography color="text.secondary">Todavía no hay cobros este mes. Crea uno con «Nuevo cobro».</Typography>}
          <Box sx={{ display: 'grid' }}>
            {delPeriodo.map((c, i) => {
              const cobrables = c.totales.unidades - c.totales.exentas;
              return (
                <Box key={c.idCobro} sx={{ py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', display: 'grid', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{c.totales.pagadas}/{cobrables}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">{clp(c.montoPorUnidad)} por unidad{c.extraordinario ? ' · extraordinario' : ''}</Typography>
                  <LinearProgress variant="determinate" value={cobrables ? (c.totales.pagadas / cobrables) * 100 : 0} color="success" sx={{ height: 4, borderRadius: 2, bgcolor: 'divider' }} />
                </Box>
              );
            })}
          </Box>
          {e.ultimoRecordatorio && (
            <Typography variant="body2" color="text.secondary" sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
              Último recordatorio de morosidad: {fechaHora(e.ultimoRecordatorio.fecha)}, a {e.ultimoRecordatorio.destinatarios} personas.
            </Typography>
          )}
        </Tarjeta>
      </Box>

      {unidad && (
        <DialogoUnidad
          key={unidad.idUnidad} unidad={unidad} estado={estados[unidad.idUnidad]} gestiona pideExencion
          onExencion={(c) => { setExencion({ idUnidad: unidad.idUnidad, idCobroUnidad: c.idCobroUnidad }); setIdUnidad(null); }}
          onClose={() => setIdUnidad(null)} onCambio={recargarTodo}
        />
      )}
      {nuevoCobro && <DialogoNuevoCobro categorias={(categorias.datos ?? []).filter((c) => c.activa)} totalUnidades={unidades.datos.length} onClose={() => setNuevoCobro(false)} onCreado={recargarTodo} />}
      {recordatorio && <DialogoRecordatorio estado={e} onClose={() => setRecordatorio(false)} onEnviado={estado.recargar} />}
      {exencion && <DialogoExencion unidades={unidades.datos} inicial={exencion} onClose={() => setExencion(null)} onSolicitada={recargarTodo} />}
    </Box>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, Typography } from '@mui/material';
import { Add as AddIcon, NotificationsActiveOutlined as RecordarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { clp, fecha, fechaHora, saludo, hoyTexto, diasHasta, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';
import DialogoRecordatorio from '../../components/finanzas/DialogoRecordatorio';

export default function InicioTesorero() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const { periodo, cobrosDelPeriodo, gastosPorCobro, correosEnviados, estadosPlano, morosos, resumen, avisosPorValidar, gastoPorId, unidadPorId } = useFinanzas();
  // Unidades cuyo residente avisó una transferencia desde la app
  const conAviso = [...new Set(avisosPorValidar.map((pg) => gastoPorId[pg.id_gasto].id_unidad))].map((id) => unidadPorId[id]);
  const [unidad, setUnidad] = useState(null);
  const [nuevoCobro, setNuevoCobro] = useState(false);
  const [recordatorio, setRecordatorio] = useState(false);

  const vencimiento = cobrosDelPeriodo[0]?.fecha_vencimiento;
  const ultimoCorreo = correosEnviados[0];

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}`}
        acciones={(
          <>
            <Button variant="outlined" color="inherit" startIcon={<RecordarIcon />} onClick={() => setRecordatorio(true)} disabled={morosos.length === 0}>
              Recordar a morosos ({morosos.length})
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNuevoCobro(true)}>Nuevo cobro</Button>
          </>
        )}
      />

      <FranjaKpi
        items={[
          { etiqueta: `Al día en ${periodo.nombre}`, valor: `${resumen.alDia} de ${resumen.totalUnidades}`, progreso: (resumen.alDia / resumen.totalUnidades) * 100 },
          { etiqueta: 'Deuda morosa', valor: clp(resumen.deudaMorosa), color: resumen.deudaMorosa ? 'error.main' : undefined, nota: `${morosos.length} unidades` },
          { etiqueta: 'Exenciones', valor: resumen.exencionesPendientes, nota: 'en revisión por Presidencia' },
          { etiqueta: 'Vencimiento', valor: vencimiento ? fecha(vencimiento) : '—', nota: vencimiento ? `en ${diasHasta(vencimiento)} días` : undefined },
        ]}
      />

      {conAviso.length > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2.5, alignItems: 'center' }}>
          {conAviso.length === 1 ? 'Una unidad avisó' : `${conAviso.length} unidades avisaron`} una transferencia desde la app. Revisa que llegó y valídala:{' '}
          {conAviso.map((u) => (
            <Button key={u.id_unidad} size="small" variant="outlined" color="inherit" onClick={() => setUnidad(u)} sx={{ ml: 1 }}>{nombreUnidad(u)}</Button>
          ))}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, alignItems: 'start' }}>
        <Tarjeta titulo={`Plano de pagos · ${periodo.nombre}`} extra="Toca una unidad para marcar sus pagos">
          <PlanoComunidad comunidad={comunidad} estados={estadosPlano} onSelect={setUnidad} />
          <LeyendaPlano />
        </Tarjeta>

        <Tarjeta titulo={`Cobros de ${periodo.nombre.split(' ')[0]}`} extra={<Button size="small" onClick={() => navigate('/panel/finanzas')}>Ver todos</Button>}>
          <Box sx={{ display: 'grid' }}>
            {cobrosDelPeriodo.map((c, i) => {
              const filas = gastosPorCobro[c.id_cobro] ?? [];
              const pagadas = filas.filter((g) => g.estado_pago === 'Pagado').length;
              const cobrables = filas.filter((g) => g.estado_pago !== 'Exento').length;
              return (
                <Box key={c.id_cobro} sx={{ py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', display: 'grid', gap: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                    <Typography sx={{ fontWeight: 700 }}>{c.concepto}</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{pagadas}/{cobrables}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {clp(c.monto_por_unidad)} por unidad{c.es_extraordinario ? ' · extraordinario' : ''}
                  </Typography>
                  <LinearProgress variant="determinate" value={cobrables ? (pagadas / cobrables) * 100 : 0} color="success" sx={{ height: 4, borderRadius: 2, bgcolor: 'divider' }} />
                </Box>
              );
            })}
          </Box>
          {ultimoCorreo && (
            <Typography variant="body2" color="text.secondary" sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
              Último correo: {ultimoCorreo.tipo === 'Nuevo cobro' ? `cobro «${ultimoCorreo.asunto}»` : 'recordatorio de morosidad'} a {ultimoCorreo.destinatarios} unidades, {fechaHora(ultimoCorreo.fecha_envio)}.
            </Typography>
          )}
        </Tarjeta>
      </Box>

      <DialogoUnidad unidad={unidad} onClose={() => setUnidad(null)} />
      <DialogoNuevoCobro open={nuevoCobro} onClose={() => setNuevoCobro(false)} />
      <DialogoRecordatorio open={recordatorio} onClose={() => setRecordatorio(false)} />
    </Box>
  );
}

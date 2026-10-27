import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, Chip, Typography } from '@mui/material';
import { ChevronRight as IrIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { clp, fecha, fechaHora, saludo, hoyTexto } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import { puedeGestionarFinanzas } from '../../utils/permisos';

// Inicio ejecutivo del Presidente: morosidad, lo que espera su revisión y KPIs.
export default function InicioPresidente() {
  const navigate = useNavigate();
  const { usuario, comunidad, cargo } = useSesion();
  const { datos, estadosPlano, morosos, resumen, exencionesPendientes, egresosPorVisar, publicacionesPorAprobar, bitacora } = useFinanzas();
  const [unidad, setUnidad] = useState(null);
  const tieneAdministrador = comunidad.modulos.includes('administrador_externo');
  const accionesAdmin = bitacora.filter((b) => b.cargo === 'administrador').slice(0, 4);

  const pendientes = [
    ...egresosPorVisar.map((e) => ({ id: e.id, tipo: 'Gasto extraordinario', titulo: e.descripcion, detalle: `${clp(e.monto)} · ${e.solicitadoPor}` })),
    ...publicacionesPorAprobar.map((x) => ({ id: x.id, tipo: x.tipo, titulo: x.titulo, detalle: `Redactado por ${x.autor} · ${fecha(x.fecha)}` })),
    ...exencionesPendientes.map((e) => ({ id: e.id, tipo: 'Exención', titulo: e.motivo, detalle: `Solicitada por ${e.solicitadaPor} · ${fecha(e.fecha)}` })),
  ];

  const kpis = [
    { etiqueta: `Recaudado ${datos.nombrePeriodo.toLowerCase()}`, valor: clp(resumen.recaudado), progreso: resumen.esperado ? (resumen.recaudado / resumen.esperado) * 100 : 0, nota: `de ${clp(resumen.esperado)}` },
    { etiqueta: 'Deuda morosa', valor: clp(resumen.deudaMorosa), color: resumen.deudaMorosa ? 'error.main' : undefined, nota: `${morosos.length} unidades` },
    { etiqueta: 'Esperan tu revisión', valor: pendientes.length, color: pendientes.length ? 'warning.main' : undefined, nota: pendientes.length ? 'gastos, comunicados y exenciones' : 'nada pendiente' },
  ];
  if (datos.fondoReserva) {
    kpis.push({ etiqueta: 'Fondo de reserva', valor: clp(datos.fondoReserva.saldo), progreso: (datos.fondoReserva.saldo / datos.fondoReserva.meta) * 100, nota: `meta ${clp(datos.fondoReserva.meta)}` });
  } else {
    kpis.push({ etiqueta: 'Unidades al día', valor: `${resumen.alDia} de ${resumen.totalUnidades}` });
  }

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}`}
        acciones={pendientes.length > 0 && (
          <Button variant="contained" onClick={() => navigate('/panel/aprobaciones')}>Revisar pendientes ({pendientes.length})</Button>
        )}
      />

      <FranjaKpi items={kpis} />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1.3fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Tarjeta titulo="Por aprobar" extra={pendientes.length > 0 && <Button size="small" onClick={() => navigate('/panel/aprobaciones')}>Ver todo</Button>}>
            {pendientes.length === 0 ? (
              <Typography color="text.secondary">No hay nada esperando tu revisión.</Typography>
            ) : (
              <Box sx={{ display: 'grid' }}>
                {pendientes.slice(0, 5).map((p, i) => (
                  <ButtonBase key={p.id} onClick={() => navigate('/panel/aprobaciones')} sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 1, width: '100%', textAlign: 'left', py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}>
                    <Box sx={{ display: 'grid', gap: 0.5, minWidth: 0 }}>
                      <Chip size="small" label={p.tipo} sx={{ justifySelf: 'start', bgcolor: 'info.light', color: 'info.main' }} />
                      <Typography sx={{ fontWeight: 700 }}>{p.titulo}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.detalle}</Typography>
                    </Box>
                    <IrIcon sx={{ color: 'text.secondary' }} />
                  </ButtonBase>
                ))}
              </Box>
            )}
          </Tarjeta>

        </Box>

        {/* La columna derecha lleva el plano y lo que hizo el administrador, para que ambas columnas pesen parecido */}
        <Box sx={{ display: 'grid', gap: 2.5, minWidth: 0 }}>
          <Tarjeta titulo={`Plano de pagos · ${datos.nombrePeriodo}`} extra="Toca una unidad para ver su detalle">
            <PlanoComunidad comunidad={comunidad} estados={estadosPlano} onSelect={setUnidad} />
            <LeyendaPlano />
          </Tarjeta>

          {tieneAdministrador && (
            <Tarjeta titulo="Últimas acciones del administrador" extra={<Button size="small" onClick={() => navigate('/panel/bitacora')}>Ver bitácora</Button>}>
              <Box sx={{ display: 'grid' }}>
                {accionesAdmin.map((b, i) => (
                  <Box key={b.id} sx={{ py: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                    <Typography sx={{ fontWeight: 700 }}>{b.accion}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.detalle} · {fechaHora(b.fecha)}</Typography>
                  </Box>
                ))}
              </Box>
            </Tarjeta>
          )}
        </Box>
      </Box>

      <DialogoUnidad unidad={unidad} onClose={() => setUnidad(null)} soloLectura={!puedeGestionarFinanzas(cargo, comunidad)} />
    </Box>
  );
}

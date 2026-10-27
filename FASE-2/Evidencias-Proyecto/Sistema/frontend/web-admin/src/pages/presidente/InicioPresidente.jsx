import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, Chip, Typography } from '@mui/material';
import { ChevronRight as IrIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { useMuro } from '../../context/MuroContext';
import { clp, fecha, fechaHora, saludo, hoyTexto } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import { puedeGestionarFinanzas } from '../../utils/permisos';
import { tieneModulo } from '../../config/modulos';

// Inicio ejecutivo del Presidente: morosidad, lo que espera su revisión y KPIs.
export default function InicioPresidente() {
  const navigate = useNavigate();
  const { usuario, comunidad, cargo } = useSesion();
  const { periodo, fondoReserva, estadosPlano, morosos, resumen, exencionesPendientes, egresosPorVisar, nombreUsuario, bitacora } = useFinanzas();
  const { publicacionesPorAprobar, conCargo } = useMuro();
  const [unidad, setUnidad] = useState(null);
  const tieneAdministrador = tieneModulo(comunidad, 'administrador_externo');
  const accionesAdmin = bitacora.filter((b) => b.cargo === 'administrador').slice(0, 4);

  const pendientes = [
    ...egresosPorVisar.map((e) => ({ id: `eg${e.id_egreso}`, tipo: 'Gasto extraordinario', titulo: e.descripcion, detalle: `${clp(e.monto)} · ${nombreUsuario(e.id_usuario_registra)}` })),
    ...publicacionesPorAprobar.map((x) => ({ id: `mu${x.id_publicacion}`, tipo: x.tipo, titulo: x.titulo, detalle: `Redactado por ${conCargo(x.id_usuario)} · ${fecha(x.fecha_creacion)}` })),
    ...exencionesPendientes.map((e) => ({ id: `ex${e.id_exencion}`, tipo: 'Exención', titulo: e.motivo, detalle: `Solicitada por ${nombreUsuario(e.id_solicitante)} · ${fecha(e.fecha_solicitud)}` })),
  ];

  const kpis = [
    { etiqueta: `Recaudado ${periodo.nombre}`, valor: clp(resumen.recaudado), progreso: resumen.esperado ? (resumen.recaudado / resumen.esperado) * 100 : 0, nota: `de ${clp(resumen.esperado)}` },
    { etiqueta: 'Deuda morosa', valor: clp(resumen.deudaMorosa), color: resumen.deudaMorosa ? 'error.main' : undefined, nota: `${morosos.length} unidades` },
    { etiqueta: 'Esperan tu revisión', valor: pendientes.length, color: pendientes.length ? 'warning.main' : undefined, nota: pendientes.length ? 'gastos, comunicados y exenciones' : 'nada pendiente' },
  ];
  if (fondoReserva) {
    kpis.push({ etiqueta: 'Fondo de reserva', valor: clp(fondoReserva.saldo), nota: 'aportes pagados menos egresos' });
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
          <Tarjeta titulo={`Plano de pagos · ${periodo.nombre}`} extra="Toca una unidad para ver su detalle">
            <PlanoComunidad comunidad={comunidad} estados={estadosPlano} onSelect={setUnidad} />
            <LeyendaPlano />
          </Tarjeta>

          {tieneAdministrador && (
            <Tarjeta titulo="Últimas acciones del administrador" extra={<Button size="small" onClick={() => navigate('/panel/bitacora')}>Ver bitácora</Button>}>
              <Box sx={{ display: 'grid' }}>
                {accionesAdmin.map((b, i) => (
                  <Box key={b.id_bitacora} sx={{ py: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
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

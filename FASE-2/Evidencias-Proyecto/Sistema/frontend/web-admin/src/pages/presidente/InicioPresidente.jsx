import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, Chip, Typography } from '@mui/material';
import { ChevronRight as IrIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as admin from '../../api/admin';
import * as finanzas from '../../api/finanzas';
import * as muroApi from '../../api/muro';
import { listarBitacora } from '../../api/bitacora';
import { useConsulta } from '../../api/useConsulta';
import { tieneModulo } from '../../config/modulos';
import { RolUsuario } from '../../config/roles';
import { clp, fecha, fechaHora, hoyTexto, saludo } from '../../utils/formato';
import { nombrePeriodo } from '../../utils/finanzas';
import { gestionaFinanzas } from '../../utils/permisos';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';

const nada = () => Promise.resolve(null);

// Inicio ejecutivo de la Presidencia: morosidad, lo que espera su firma, el fondo de reserva y, si hay
// administrador externo, sus últimas acciones (GET bitacora con rol Administrador).
export default function InicioPresidente() {
  const navigate = useNavigate();
  const { usuario, comunidad, cargo } = useSesion();
  const conCobros = tieneModulo(comunidad, 'cobros');
  const conMuro = tieneModulo(comunidad, 'muro');
  const tieneAdministrador = tieneModulo(comunidad, 'administrador_externo');
  const estado = useConsulta(conCobros ? finanzas.estado : nada, [comunidad.idRed, conCobros]);
  const egresos = useConsulta(conCobros ? finanzas.listarEgresos : nada, [comunidad.idRed, conCobros]);
  const exenciones = useConsulta(conCobros ? finanzas.listarExenciones : nada, [comunidad.idRed, conCobros]);
  const reporte = useConsulta(conCobros ? () => finanzas.reporte() : nada, [comunidad.idRed, conCobros]);
  const oficiales = useConsulta(conMuro ? muroApi.listarOficiales : nada, [comunidad.idRed, conMuro]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const bitacora = useConsulta(tieneAdministrador ? () => listarBitacora({ rol: RolUsuario.ADMINISTRADOR }) : nada, [comunidad.idRed, tieneAdministrador]);
  const [idUnidad, setIdUnidad] = useState(null);

  const e = estado.datos;
  const pendientes = [
    ...(egresos.datos ?? []).filter((x) => x.estadoVisado === 'Pendiente')
      .map((x) => ({ id: `eg${x.idEgreso}`, tipo: 'Egreso', titulo: x.descripcion, detalle: `${clp(x.monto)} · ${x.creadoPor?.nombre ?? 'Tesorería'}` })),
    ...(oficiales.datos ?? []).filter((x) => x.estadoAprobacion === 'Pendiente')
      .map((x) => ({ id: `mu${x.idPublicacion}`, tipo: x.tipo, titulo: x.titulo, detalle: `Redactado por ${x.autor?.nombre ?? 'la directiva'} · ${fecha(x.fecha)}` })),
    ...(exenciones.datos ?? []).filter((x) => x.estado === 'Por aprobar')
      .map((x) => ({ id: `ex${x.idExencion}`, tipo: 'Exención', titulo: x.motivo, detalle: `${x.concepto} · pedida por ${x.solicitadaPor?.nombre ?? 'un vecino'} · ${fecha(x.fechaSolicitud)}` })),
  ];
  // Fondo de reserva: el saldo histórico de su categoría (recaudado menos egresos válidos)
  const fondo = reporte.datos?.porCategoria.find((c) => c.nombre.toLowerCase().includes('reserva'));

  const kpis = [];
  if (e) {
    kpis.push(
      { etiqueta: `Recaudado ${nombrePeriodo(e.periodo)}`, valor: clp(e.resumen.recaudado), progreso: e.resumen.esperado ? (e.resumen.recaudado / e.resumen.esperado) * 100 : 0, nota: `de ${clp(e.resumen.esperado)}` },
      { etiqueta: 'Deuda vencida', valor: clp(e.resumen.deudaMorosa), color: e.resumen.deudaMorosa ? 'error.main' : undefined, nota: `${e.morosos.length} ${e.morosos.length === 1 ? 'unidad' : 'unidades'}` },
    );
  }
  kpis.push({ etiqueta: 'Esperan tu revisión', valor: pendientes.length, color: pendientes.length ? 'warning.main' : undefined, nota: pendientes.length ? 'egresos, comunicados y exenciones' : 'nada pendiente' });
  if (fondo) kpis.push({ etiqueta: fondo.nombre, valor: clp(fondo.saldoHistorico), nota: 'recaudado menos egresos' });
  else if (e) kpis.push({ etiqueta: 'Unidades al día', valor: `${e.resumen.alDia} de ${e.resumen.totalUnidades}` });

  const estados = e ? Object.fromEntries(e.unidades.map((u) => [u.idUnidad, u.estado])) : {};
  const unidad = idUnidad && unidades.datos?.find((u) => u.idUnidad === idUnidad);
  const accionesAdmin = (bitacora.datos?.registros ?? []).slice(0, 4);

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

        {/* La columna derecha lleva el plano y lo que hizo el administrador, para que ambas columnas pesen parecido */}
        <Box sx={{ display: 'grid', gap: 2.5, minWidth: 0 }}>
          {e && unidades.datos && (
            <Tarjeta titulo={`Plano de pagos · ${nombrePeriodo(e.periodo)}`} extra="Toca una unidad para ver su detalle">
              <PlanoComunidad comunidad={{ tipo: comunidad.tipo, unidades: unidades.datos }} estados={estados} onSelect={(u) => setIdUnidad(u.idUnidad)} />
              <LeyendaPlano />
            </Tarjeta>
          )}

          {tieneAdministrador && (
            <Tarjeta titulo="Últimas acciones del administrador" extra={<Button size="small" onClick={() => navigate('/panel/bitacora')}>Ver bitácora</Button>}>
              {bitacora.datos && accionesAdmin.length === 0 && <Typography color="text.secondary">El administrador todavía no registra acciones.</Typography>}
              <Box sx={{ display: 'grid' }}>
                {accionesAdmin.map((b, i) => (
                  <Box key={b.idBitacora} sx={{ py: 1, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                    <Typography sx={{ fontWeight: 700 }}>{b.descripcion}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.usuario?.nombre ?? 'Administración'} · {fechaHora(b.fecha)}</Typography>
                  </Box>
                ))}
              </Box>
            </Tarjeta>
          )}
        </Box>
      </Box>

      {unidad && (
        <DialogoUnidad
          key={unidad.idUnidad} unidad={unidad} estado={estados[unidad.idUnidad]} gestiona={gestionaFinanzas(cargo, comunidad)} pideExencion={false}
          onExencion={() => {}} onClose={() => setIdUnidad(null)} onCambio={estado.recargar}
        />
      )}
    </Box>
  );
}

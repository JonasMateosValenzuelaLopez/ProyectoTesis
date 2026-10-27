import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { useAdmin } from '../../context/AdminContext';
import { useMuro } from '../../context/MuroContext';
import { clp, fechaHora, hoyTexto, saludo } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import SelloCargo from '../../components/marca/SelloCargo';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';
import { tieneModulo } from '../../config/modulos';
import { residenciasActivas } from '../../config/roles';

const cifra = { fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontVariantNumeric: 'tabular-nums' };

// Inicio de Administración: lo que hay que resolver hoy, y a un costado las cifras, el plano de pagos y la actividad.
export default function Inicio() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const { periodo, estadosPlano, morosos, resumen, egresosPorVisar, avisosPorValidar, gastoPorId, bitacora } = useFinanzas();
  const unidadesConAviso = new Set(avisosPorValidar.map((pg) => gastoPorId[pg.id_gasto].id_unidad)).size;
  const { solicitudesPendientes, usuarios, ocupantes } = useAdmin();
  const { reportadas } = useMuro();
  const [unidad, setUnidad] = useState(null);
  const [nuevoCobro, setNuevoCobro] = useState(false);
  const tiene = (m) => tieneModulo(comunidad, m);

  const invitados = usuarios.filter((u) => u.estado === 'Invitado').length;
  const sinResidentes = comunidad.unidades.filter((u) => !ocupantes[u.id_unidad]?.length).length;

  const tareas = [
    { n: solicitudesPendientes.length, texto: 'solicitudes de acceso por revisar', uno: 'solicitud de acceso por revisar', ruta: '/panel/residentes' },
    tiene('muro') && { n: reportadas.length, texto: 'publicaciones reportadas por vecinos', uno: 'publicación reportada por vecinos', ruta: '/panel/muro' },
    tiene('cobros') && { n: unidadesConAviso, texto: 'transferencias avisadas por validar (toca la unidad en el plano)', uno: 'transferencia avisada por validar (toca la unidad en el plano)', ruta: null },
    tiene('cobros') && { n: morosos.length, texto: 'unidades con deuda de meses anteriores', uno: 'unidad con deuda de meses anteriores', ruta: '/panel/morosidad' },
    tiene('cobros') && { n: egresosPorVisar.length, texto: 'gastos esperando el visado de la Presidencia', uno: 'gasto esperando el visado de la Presidencia', ruta: null },
    { n: invitados, texto: 'invitaciones sin aceptar', uno: 'invitación sin aceptar', ruta: '/panel/residentes' },
  ].filter((t) => t && t.n > 0);

  const cifras = [];
  if (tiene('cobros')) {
    cifras.push(
      { etiqueta: `Recaudado ${periodo.nombre}`, valor: clp(resumen.recaudado), nota: `de ${clp(resumen.esperado)}` },
      { etiqueta: 'Unidades al día', valor: `${resumen.alDia} de ${resumen.totalUnidades}` },
    );
  }
  cifras.push(
    { etiqueta: 'Residentes activos', valor: usuarios.filter((u) => u.estado === 'Activo' && residenciasActivas(u).length).length, nota: invitados === 1 ? '1 invitación pendiente' : `${invitados} invitaciones pendientes` },
    { etiqueta: 'Unidades sin residentes', valor: sinResidentes, color: sinResidentes ? 'warning.main' : undefined, nota: sinResidentes ? 'nadie registrado en la app' : 'todas con residentes' },
  );

  const pendientes = tareas.length === 1 ? 'Tienes 1 cosa por resolver.' : `Tienes ${tareas.length} cosas por resolver.`;

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}. ${tareas.length ? pendientes : 'Nada pendiente.'}`}
        acciones={tiene('cobros') && <Button variant="contained" onClick={() => setNuevoCobro(true)}>Nuevo cobro</Button>}
      />

      {/* El día como una cola de trabajo: cada pendiente con su botón, y las cifras, el plano y la actividad a un costado */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, alignItems: 'start' }}>
        <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
          {tareas.length === 0 ? (
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 3 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Todo al día</Typography>
              <Typography color="text.secondary">No hay solicitudes, reportes ni deudas que revisar. Lo nuevo aparecerá aquí.</Typography>
            </Box>
          ) : tareas.map((t, i) => (
            <Box key={t.texto} sx={{ display: 'grid', gridTemplateColumns: { xs: '36px 1fr auto', sm: '56px 1fr auto' }, alignItems: 'center', gap: { xs: 1.5, sm: 2 }, px: { xs: 2, sm: 2.5 }, py: 2, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Typography sx={{ ...cifra, fontSize: { xs: '1.75rem', sm: '2.25rem' }, lineHeight: 1, color: t.ruta ? 'bronce.main' : 'text.secondary' }}>{t.n}</Typography>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>{t.n === 1 ? t.uno : t.texto}</Typography>
                {!t.ruta && <Typography variant="body2" color="text.secondary">Lo resuelve otro cargo; aquí solo lo sigues.</Typography>}
              </Box>
              {t.ruta && <Button variant="outlined" onClick={() => navigate(t.ruta)}>Revisar</Button>}
            </Box>
          ))}
        </Paper>

        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Paper variant="outlined" sx={{ borderRadius: 1.5, p: { xs: 2, sm: 2.5 }, display: 'grid', gap: 1.5 }}>
            {cifras.map((c) => (
              <Box key={c.etiqueta} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography color="text.secondary">{c.etiqueta}</Typography>
                  {c.nota && <Typography variant="body2" color="text.secondary">{c.nota}</Typography>}
                </Box>
                <Typography sx={{ ...cifra, fontSize: '1.35rem', color: c.color, whiteSpace: 'nowrap' }}>{c.valor}</Typography>
              </Box>
            ))}
          </Paper>

          {tiene('cobros') ? (
            <Tarjeta titulo={`Plano de pagos · ${periodo.nombre}`} extra="Toca una unidad">
              <PlanoComunidad comunidad={comunidad} estados={estadosPlano} onSelect={setUnidad} />
              <LeyendaPlano />
            </Tarjeta>
          ) : (
            <Tarjeta titulo="Cobros desactivados">
              <Typography color="text.secondary">Esta comunidad no usa el módulo de cobros. Puedes activarlo en Módulos.</Typography>
            </Tarjeta>
          )}

          <Tarjeta titulo="Actividad reciente" extra="Todos los cargos">
            <Box sx={{ display: 'grid', gap: 1 }}>
              {bitacora.slice(0, 4).map((b) => (
                <Box key={b.id_bitacora} sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
                  <SelloCargo cargo={b.cargo} size={18} />
                  <Typography variant="body2"><b>{b.accion}</b> · {b.usuario} · {fechaHora(b.fecha)}</Typography>
                </Box>
              ))}
              {bitacora.length === 0 && <Typography color="text.secondary">Sin actividad todavía.</Typography>}
            </Box>
          </Tarjeta>
        </Box>
      </Box>

      <DialogoUnidad unidad={unidad} onClose={() => setUnidad(null)} />
      <DialogoNuevoCobro open={nuevoCobro} onClose={() => setNuevoCobro(false)} />
    </Box>
  );
}

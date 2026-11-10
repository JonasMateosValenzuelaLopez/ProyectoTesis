import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Paper, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import * as admin from '../../api/admin';
import * as finanzas from '../../api/finanzas';
import * as muroApi from '../../api/muro';
import { listarBitacora } from '../../api/bitacora';
import { useConsulta } from '../../api/useConsulta';
import { tieneModulo } from '../../config/modulos';
import { ID_ROL_POR_NOMBRE, RolUsuario } from '../../config/roles';
import { clp, fechaHora, hoyTexto, saludo } from '../../utils/formato';
import { nombrePeriodo } from '../../utils/finanzas';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import SelloCargo from '../../components/marca/SelloCargo';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import AvisoConsultas from '../../components/ui/AvisoConsultas';
import { estadoConsultas } from '../../utils/consultas';

const cifra = { fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontVariantNumeric: 'tabular-nums' };
const nada = () => Promise.resolve(null);

// Inicio de Administración: lo que hay que resolver hoy y, a un costado, las cifras, el plano de pagos y la actividad.
// Cada número viene de la API de su módulo; los módulos desactivados no se consultan.
export default function Inicio() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const tiene = (m) => tieneModulo(comunidad, m);
  const conCobros = tiene('cobros');
  const conMuro = tiene('muro');
  const solicitudes = useConsulta(() => admin.listarSolicitudes('Pendiente'), [comunidad.idRed]);
  const residentes = useConsulta(admin.listarResidentes, [comunidad.idRed]);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const estado = useConsulta(conCobros ? finanzas.estado : nada, [comunidad.idRed, conCobros]);
  const muro = useConsulta(conMuro ? () => muroApi.moderacionMuro() : nada, [comunidad.idRed, conMuro]);
  const bitacora = useConsulta(() => listarBitacora(), [comunidad.idRed]);
  const [idUnidad, setIdUnidad] = useState(null);

  const e = estado.datos;
  const personas = residentes.datos ?? [];
  const invitados = personas.filter((p) => p.estado === 'Invitado').length;
  const activos = personas.filter((p) => p.estado === 'Activo' && p.viviendas.length).length;
  const sinResidentes = (unidades.datos ?? []).filter((u) => !u.ocupantes.length).length;
  const reportadas = (muro.datos?.publicaciones ?? []).filter((p) => p.estadoModeracion === 'Publicada' && p.reportes?.length).length;
  const conAviso = e ? new Set(e.avisosPorValidar.map((a) => a.idUnidad)).size : 0;

  const tareas = [
    { n: solicitudes.datos?.length ?? 0, texto: 'solicitudes de acceso por revisar', uno: 'solicitud de acceso por revisar', ruta: '/panel/residentes' },
    conMuro && { n: reportadas, texto: 'publicaciones reportadas por vecinos', uno: 'publicación reportada por vecinos', ruta: '/panel/muro' },
    conCobros && { n: conAviso, texto: 'transferencias avisadas por validar', uno: 'transferencia avisada por validar', ruta: '/panel/finanzas' },
    conCobros && { n: e?.morosos.length ?? 0, texto: 'unidades con cobros vencidos', uno: 'unidad con cobros vencidos', ruta: '/panel/morosidad' },
    conCobros && { n: e?.resumen.egresosPorVisar ?? 0, texto: 'egresos esperando el visado de la Presidencia', uno: 'egreso esperando el visado de la Presidencia', ruta: null },
    { n: invitados, texto: 'invitaciones sin aceptar', uno: 'invitación sin aceptar', ruta: '/panel/residentes' },
  ].filter((t) => t && t.n > 0);

  const cifras = [];
  if (e) {
    cifras.push(
      { etiqueta: `Recaudado ${nombrePeriodo(e.periodo)}`, valor: clp(e.resumen.recaudado), nota: `de ${clp(e.resumen.esperado)}` },
      { etiqueta: 'Unidades al día', valor: `${e.resumen.alDia} de ${e.resumen.totalUnidades}` },
    );
  }
  if (residentes.datos) cifras.push({ etiqueta: 'Residentes activos', valor: activos, nota: invitados === 1 ? '1 invitación pendiente' : `${invitados} invitaciones pendientes` });
  if (unidades.datos) cifras.push({ etiqueta: 'Unidades sin residentes', valor: sinResidentes, color: sinResidentes ? 'warning.main' : undefined, nota: sinResidentes ? 'nadie registrado en la app' : 'todas con residentes' });

  // «Nada pendiente» solo si todas las consultas respondieron: si una falló o no ha llegado, no se puede saber
  const { fallidas, completo } = estadoConsultas([
    { nombre: 'las solicitudes de acceso', consulta: solicitudes },
    { nombre: 'los residentes', consulta: residentes },
    { nombre: 'las unidades', consulta: unidades },
    ...(conCobros ? [{ nombre: 'los cobros', consulta: estado }] : []),
    ...(conMuro ? [{ nombre: 'los reportes del muro', consulta: muro }] : []),
  ]);
  const pendientes = tareas.length === 1 ? 'Tienes 1 cosa por resolver.' : `Tienes ${tareas.length} cosas por resolver.`;
  const resumenDia = tareas.length ? pendientes : completo ? 'Nada pendiente.' : '';
  const unidad = idUnidad && unidades.datos?.find((u) => u.idUnidad === idUnidad);
  const estados = e ? Object.fromEntries(e.unidades.map((u) => [u.idUnidad, u.estado])) : {};
  const actividad = (bitacora.datos?.registros ?? []).slice(0, 5);

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}.${resumenDia ? ` ${resumenDia}` : ''}`}
        acciones={conCobros && <Button variant="contained" onClick={() => navigate('/panel/finanzas')}>Ir a cobros</Button>}
      />
      <AvisoConsultas fallidas={fallidas} sx={{ mb: 2.5 }} />

      {/* El día como una cola de trabajo: cada pendiente con su botón, y las cifras, el plano y la actividad a un costado */}
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.5fr 1fr' }, alignItems: 'start' }}>
        <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden' }}>
          {tareas.length === 0 ? (
            <Box sx={{ px: { xs: 2, sm: 2.5 }, py: 3 }}>
              {completo ? (
                <>
                  <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>Todo al día</Typography>
                  <Typography color="text.secondary">No hay solicitudes, reportes ni deudas que revisar. Lo nuevo aparecerá aquí.</Typography>
                </>
              ) : fallidas.length ? (
                <Typography color="text.secondary">No sabemos si hay pendientes porque parte de la información no se pudo cargar.</Typography>
              ) : (
                <Typography color="text.secondary">Revisando pendientes…</Typography>
              )}
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
          {cifras.length > 0 && (
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
          )}

          {conCobros ? (
            e && unidades.datos && (
              <Tarjeta titulo={`Plano de pagos · ${nombrePeriodo(e.periodo)}`} extra="Toca una unidad">
                <PlanoComunidad comunidad={{ tipo: comunidad.tipo, unidades: unidades.datos }} estados={estados} onSelect={(u) => setIdUnidad(u.idUnidad)} />
                <LeyendaPlano />
              </Tarjeta>
            )
          ) : (
            <Tarjeta titulo="Cobros desactivados">
              <Typography color="text.secondary">Esta comunidad no usa el módulo de cobros. El equipo de EntreCasas lo activa a pedido de la comunidad.</Typography>
            </Tarjeta>
          )}

          <Tarjeta titulo="Actividad reciente" extra="Todos los cargos">
            <Box sx={{ display: 'grid', gap: 1 }}>
              {actividad.map((b) => (
                <Box key={b.idBitacora} sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
                  <SelloCargo cargo={ID_ROL_POR_NOMBRE[b.usuario?.cargo] ?? RolUsuario.RESIDENTE} size={18} />
                  <Typography variant="body2"><b>{b.descripcion}</b> · {b.usuario?.nombre ?? 'Sistema'} · {fechaHora(b.fecha)}</Typography>
                </Box>
              ))}
              {bitacora.datos && actividad.length === 0 && <Typography color="text.secondary">Sin actividad todavía.</Typography>}
              {bitacora.error && <Typography color="error">{bitacora.error.message}</Typography>}
            </Box>
          </Tarjeta>
        </Box>
      </Box>

      {unidad && (
        <DialogoUnidad
          key={unidad.idUnidad} unidad={unidad} estado={estados[unidad.idUnidad]} gestiona pideExencion={false}
          onExencion={() => {}} onClose={() => setIdUnidad(null)} onCambio={estado.recargar}
        />
      )}
    </Box>
  );
}

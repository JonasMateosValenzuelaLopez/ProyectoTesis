import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, ButtonBase, Typography } from '@mui/material';
import { ChevronRight as IrIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { useAdmin } from '../../context/AdminContext';
import { clp, fechaHora, hoyTexto, saludo } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import SelloCargo from '../../components/marca/SelloCargo';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoUnidad from '../../components/finanzas/DialogoUnidad';
import DialogoNuevoCobro from '../../components/finanzas/DialogoNuevoCobro';

// Inicio de Administración: lo que hay que resolver hoy, el plano de pagos y la actividad reciente.
export default function Inicio() {
  const navigate = useNavigate();
  const { usuario, comunidad } = useSesion();
  const { datos, estadosPlano, morosos, resumen, egresosPorVisar, bitacora } = useFinanzas();
  const { solicitudesPendientes, reportadas, usuarios, ocupantes } = useAdmin();
  const [unidad, setUnidad] = useState(null);
  const [nuevoCobro, setNuevoCobro] = useState(false);
  const tiene = (m) => comunidad.modulos.includes(m);

  const invitados = usuarios.filter((u) => u.estado === 'invitado').length;
  const sinResidentes = comunidad.unidades.filter((u) => !ocupantes[u.id]?.length).length;

  const tareas = [
    { n: solicitudesPendientes.length, texto: 'solicitudes de acceso por revisar', uno: 'solicitud de acceso por revisar', ruta: '/panel/residentes' },
    tiene('muro') && { n: reportadas.length, texto: 'publicaciones reportadas por vecinos', uno: 'publicación reportada por vecinos', ruta: '/panel/muro' },
    tiene('cobros') && { n: morosos.length, texto: 'unidades con deuda de meses anteriores', uno: 'unidad con deuda de meses anteriores', ruta: '/panel/morosidad' },
    tiene('cobros') && { n: egresosPorVisar.length, texto: 'gastos esperando el visado del Presidente', uno: 'gasto esperando el visado del Presidente', ruta: null },
    { n: invitados, texto: 'invitaciones sin aceptar', uno: 'invitación sin aceptar', ruta: '/panel/residentes' },
  ].filter((t) => t && t.n > 0);

  const kpis = [];
  if (tiene('cobros')) {
    kpis.push(
      { etiqueta: `Recaudado ${datos.nombrePeriodo.toLowerCase()}`, valor: clp(resumen.recaudado), progreso: resumen.esperado ? (resumen.recaudado / resumen.esperado) * 100 : 0, nota: `de ${clp(resumen.esperado)}` },
      { etiqueta: 'Unidades al día', valor: `${resumen.alDia} de ${resumen.totalUnidades}` },
    );
  }
  kpis.push(
    { etiqueta: 'Residentes activos', valor: usuarios.filter((u) => u.estado === 'activo' && u.residencias.length).length, nota: invitados === 1 ? '1 invitación pendiente' : `${invitados} invitaciones pendientes` },
    { etiqueta: 'Unidades sin residentes', valor: sinResidentes, color: sinResidentes ? 'warning.main' : undefined, nota: sinResidentes ? 'nadie registrado en la app' : 'todas con residentes' },
  );

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${hoyTexto()}`}
        titulo={`${saludo()}, ${usuario.nombre}`}
        acciones={tiene('cobros') && <Button variant="contained" onClick={() => setNuevoCobro(true)}>Nuevo cobro</Button>}
      />

      <FranjaKpi items={kpis} />

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1fr 1.3fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Tarjeta titulo="Para resolver">
            {tareas.length === 0 ? <Typography color="text.secondary">Nada pendiente. Buen trabajo.</Typography> : (
              <Box sx={{ display: 'grid', mt: -1 }}>
                {tareas.map((t, i) => {
                  const contenido = (
                    <>
                      <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.5rem', minWidth: '2ch', color: 'bronce.main' }}>{t.n}</Typography>
                      <Typography sx={{ flex: 1 }}>{t.n === 1 ? t.uno : t.texto}</Typography>
                      {t.ruta && <IrIcon sx={{ color: 'text.secondary' }} />}
                    </>
                  );
                  const sx = { display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, width: '100%', textAlign: 'left', borderTop: i ? 1 : 0, borderColor: 'divider' };
                  return t.ruta
                    ? <ButtonBase key={t.texto} onClick={() => navigate(t.ruta)} sx={{ ...sx, borderRadius: 0, '&:hover': { bgcolor: 'action.hover' } }}>{contenido}</ButtonBase>
                    : <Box key={t.texto} sx={sx}>{contenido}</Box>;
                })}
              </Box>
            )}
          </Tarjeta>

          <Tarjeta titulo="Actividad reciente" extra="Todos los cargos">
            <Box sx={{ display: 'grid', mt: -1 }}>
              {bitacora.slice(0, 5).map((b, i) => (
                <Box key={b.id} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 1.5, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                  <SelloCargo cargo={b.cargo} sx={{ mt: 0.25 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{b.accion}</Typography>
                    <Typography variant="body2" color="text.secondary">{b.usuario} · {b.detalle} · {fechaHora(b.fecha)}</Typography>
                  </Box>
                </Box>
              ))}
              {bitacora.length === 0 && <Typography color="text.secondary">Sin actividad todavía.</Typography>}
            </Box>
          </Tarjeta>
        </Box>

        {tiene('cobros') ? (
          <Tarjeta titulo={`Plano de pagos · ${datos.nombrePeriodo}`} extra="Toca una unidad para registrar su pago">
            <PlanoComunidad comunidad={comunidad} estados={estadosPlano} onSelect={setUnidad} />
            <LeyendaPlano />
          </Tarjeta>
        ) : (
          <Tarjeta titulo="Cobros desactivados">
            <Typography color="text.secondary">Esta comunidad no usa el módulo de cobros. Puedes activarlo en Módulos.</Typography>
          </Tarjeta>
        )}
      </Box>

      <DialogoUnidad unidad={unidad} onClose={() => setUnidad(null)} />
      <DialogoNuevoCobro open={nuevoCobro} onClose={() => setNuevoCobro(false)} />
    </Box>
  );
}

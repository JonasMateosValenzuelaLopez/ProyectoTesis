import { Alert, Box, Button, Chip, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useFinanzas } from '../../context/FinanzasContext';
import { useMuro } from '../../context/MuroContext';
import { residentes } from '../../data/finanzasMock';
import { clp, fecha, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

function Fila({ children, acciones, primera }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr auto' }, gap: 2, alignItems: 'center', py: 2, borderTop: primera ? 0 : 1, borderColor: 'divider' }}>
      <Box sx={{ minWidth: 0, display: 'grid', gap: 0.5 }}>{children}</Box>
      <Box sx={{ display: 'flex', gap: 1 }}>{acciones}</Box>
    </Box>
  );
}

const Decision = ({ onAprobar, onRechazar, aprobar = 'Aprobar', rechazar = 'Rechazar' }) => (
  <>
    <Button variant="contained" onClick={onAprobar}>{aprobar}</Button>
    <Button color="inherit" onClick={onRechazar}>{rechazar}</Button>
  </>
);

// Todo lo que necesita la firma del Presidente, agrupado por tipo.
export default function PorAprobar() {
  const { comunidad } = useSesion();
  const { umbralVisado, egresosPorVisar, exencionesPendientes, unidadPorId, gastoPorId, cobroPorId, categoriaPorId, nombreUsuario, acciones } = useFinanzas();
  const { publicacionesPorAprobar, conCargo, acciones: muro } = useMuro();
  const total = egresosPorVisar.length + publicacionesPorAprobar.length + exencionesPendientes.length;

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Por aprobar"
        descripcion={total ? `${total} elementos esperan tu decisión. Cada decisión queda registrada en la bitácora.` : 'No hay nada esperando tu decisión.'}
      />

      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Tarjeta titulo="Gastos extraordinarios" extra={`Requieren visado desde ${clp(umbralVisado)}`}>
          {egresosPorVisar.length === 0 ? <Typography color="text.secondary">Sin gastos por visar.</Typography> : egresosPorVisar.map((e, i) => (
            <Fila key={e.id_egreso} primera={i === 0} acciones={<Decision aprobar="Visar" onAprobar={() => acciones.resolverEgreso(e.id_egreso, true)} onRechazar={() => acciones.resolverEgreso(e.id_egreso, false)} />}>
              <Typography sx={{ fontWeight: 700 }}>{e.descripcion}</Typography>
              <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: '1.3rem' }}>{clp(e.monto)}</Typography>
              <Typography variant="body2" color="text.secondary">{categoriaPorId[e.id_categoria]?.nombre ?? 'Sin categoría'}{e.proveedor ? ` · ${e.proveedor}` : ''} · registrado por {nombreUsuario(e.id_usuario_registra)} el {fecha(e.fecha)}</Typography>
            </Fila>
          ))}
        </Tarjeta>

        <Tarjeta titulo="Comunicados oficiales y normas">
          {publicacionesPorAprobar.length === 0 ? <Typography color="text.secondary">Sin comunicados por aprobar.</Typography> : publicacionesPorAprobar.map((x, i) => (
            <Fila key={x.id_publicacion} primera={i === 0} acciones={<Decision aprobar="Aprobar y publicar" rechazar="Devolver" onAprobar={() => muro.resolverPublicacion(x.id_publicacion, true)} onRechazar={() => muro.resolverPublicacion(x.id_publicacion, false)} />}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" label={x.tipo} sx={{ bgcolor: 'info.light', color: 'info.main' }} />
                <Typography sx={{ fontWeight: 700 }}>{x.titulo}</Typography>
              </Box>
              <Typography color="text.secondary" sx={{ maxWidth: '65ch' }}>{x.contenido}</Typography>
              <Typography variant="body2" color="text.secondary">Redactado por {conCargo(x.id_usuario)} · {fecha(x.fecha_creacion)}</Typography>
            </Fila>
          ))}
        </Tarjeta>

        <Tarjeta titulo="Exenciones de cobro">
          {exencionesPendientes.length === 0 ? <Typography color="text.secondary">Sin exenciones por revisar.</Typography> : exencionesPendientes.map((e, i) => {
            const g = gastoPorId[e.id_gasto];
            const u = unidadPorId[g.id_unidad];
            return (
              <Fila key={e.id_exencion} primera={i === 0} acciones={<Decision onAprobar={() => acciones.resolverExencion(e.id_exencion, true)} onRechazar={() => acciones.resolverExencion(e.id_exencion, false)} />}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <PlacaUnidad unidad={u} size="sm" />
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>{nombreUnidad(u)}{residentes[u.id_unidad] ? ` · ${residentes[u.id_unidad]}` : ''}</Typography>
                    <Typography variant="body2" color="text.secondary">{cobroPorId[g.id_cobro]?.concepto ?? g.descripcion} · {clp(g.monto_total)}</Typography>
                  </Box>
                </Box>
                <Typography color="text.secondary">«{e.motivo}»</Typography>
                <Typography variant="body2" color="text.secondary">Solicitada por {nombreUsuario(e.id_solicitante)} · {fecha(e.fecha_solicitud)}</Typography>
              </Fila>
            );
          })}
          {exencionesPendientes.length > 0 && (
            <Alert severity="info" variant="outlined">Al aprobar, el cobro de esa unidad queda exento. Al rechazar, sigue vigente.</Alert>
          )}
        </Tarjeta>
      </Box>
    </Box>
  );
}

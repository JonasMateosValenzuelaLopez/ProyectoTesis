import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { LoginOutlined as EntraIcon, LogoutOutlined as SaleIcon, BlockOutlined as RechazoIcon, HourglassEmptyOutlined as EsperaIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { fecha, horaMinuto, nombreUnidad } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';

const hoy = () => new Date().toDateString();
const cuando = (iso) => (new Date(iso).toDateString() === hoy() ? horaMinuto(iso) : `${fecha(iso)} · ${horaMinuto(iso)}`);

// Cómo terminó cada llegada
function estadoDe(a) {
  if (a.estadoAutorizacion === 'Rechazado') return { icono: <RechazoIcon fontSize="small" />, texto: 'No autorizado', color: 'error' };
  if (a.estadoAutorizacion !== 'Aprobado') return { icono: <EsperaIcon fontSize="small" />, texto: 'Expiró sin respuesta', color: 'default' };
  if (a.salidaEn) return { icono: <SaleIcon fontSize="small" />, texto: 'Salió', color: 'default' };
  return { icono: <EntraIcon fontSize="small" />, texto: 'Adentro', color: 'success' };
}
const via = (a) => (a.autorizadoVia === 'Invitación' ? `invitación · ${a.metodo}` : a.autorizadoVia === 'App' ? 'autorizó en la app' : a.autorizadoVia === 'Teléfono' ? 'autorizó por teléfono' : null);

// Historial de llegadas (GET porteria/accesos), lo último arriba. Se actualiza solo junto con la garita.
export default function MonitorAccesos({ paginado }) {
  const { comunidad } = useSesion();
  const lista = paginado.items ?? [];
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" component="h2">Accesos</Typography>
      </Box>
      <Box sx={{ overflowY: 'auto', maxHeight: { lg: 720 } }} aria-live="polite">
        {paginado.error && <Typography color="error" sx={{ p: 2.5 }}>{paginado.error.message}</Typography>}
        {paginado.items && lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2.5 }}>Todavía no hay ingresos de visitas registrados.</Typography>}
        {lista.map((a, i) => {
          const e = estadoDe(a);
          const u = conTipo(a.unidad, comunidad);
          return (
            <Box key={a.idAcceso} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', px: 2.5, py: 1.25, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
              <Box sx={{ width: 34, height: 34, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: e.color === 'success' ? 'success.light' : e.color === 'error' ? 'error.light' : 'action.hover', color: e.color === 'default' ? 'text.secondary' : `${e.color}.main` }}>
                {e.icono}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>{a.visitante}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {[a.categoria, u && nombreUnidad(u), via(a), a.patente].filter(Boolean).join(' · ')}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Chip size="small" variant="outlined" color={e.color} label={e.texto} />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontVariantNumeric: 'tabular-nums' }}>
                  {a.ingresoEn ? `${cuando(a.ingresoEn)}${a.salidaEn ? ` → ${horaMinuto(a.salidaEn)}` : ''}` : cuando(a.llegada)}
                </Typography>
              </Box>
            </Box>
          );
        })}
        {paginado.siguiente && (
          <Box sx={{ p: 1.5, textAlign: 'center', borderTop: 1, borderColor: 'divider' }}>
            <Button loading={paginado.cargandoMas} onClick={paginado.cargarMas}>Ver anteriores</Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

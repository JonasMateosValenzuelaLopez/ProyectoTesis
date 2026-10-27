import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { horaMinuto } from '../../utils/formato';
import PlacaUnidad from '../marca/PlacaUnidad';

const TIPO = { visita: 'Visita', proveedor: 'Proveedor', servicio: 'Servicio', delivery: 'Delivery' };
const ESTADO = {
  esperada: { texto: 'Esperada', color: 'warning' },
  adentro: { texto: 'Adentro', color: 'success' },
  salio: { texto: 'Salió', color: 'default' },
  cancelada: { texto: 'Cancelada', color: 'default' },
};

// Visitas con invitación para hoy. El ingreso manual sirve cuando el QR no se puede leer.
export default function VisitasHoy() {
  const { visitasHoy, unidadPorId, acciones } = useConserjeria();
  const ahora = new Date();
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3 }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
        <Typography variant="h6" component="h2">Visitas de hoy</Typography>
        <Typography variant="body2" color="text.secondary">{visitasHoy.filter((v) => v.estado === 'esperada').length} por llegar · {visitasHoy.filter((v) => v.estado === 'adentro').length} adentro</Typography>
      </Box>
      {visitasHoy.length === 0 && <Typography color="text.secondary" sx={{ p: 2.5 }}>No hay visitas con invitación para hoy.</Typography>}
      {visitasHoy.map((v, i) => {
        const u = unidadPorId[v.idUnidad];
        const vencida = v.estado === 'esperada' && ahora > new Date(v.hasta);
        const e = vencida ? { texto: 'Vencida', color: 'default' } : ESTADO[v.estado];
        return (
          <Box key={v.id} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '64px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', opacity: ['salio', 'cancelada'].includes(v.estado) || vencida ? 0.6 : 1 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{horaMinuto(v.desde)}</Typography>
              <Typography variant="caption" color="text.secondary">a {horaMinuto(v.hasta)}</Typography>
            </Box>
            <PlacaUnidad tipo={u.tipo} numero={u.numero} size="sm" />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{v.visitante}</Typography>
              <Typography variant="body2" color="text.secondary">
                {TIPO[v.tipo]} de {residentes[v.idUnidad] ?? 'la unidad'}{v.patente ? ` · ${v.patente}` : ''}
                <Box component="span" sx={{ display: { sm: 'none' } }}> · {horaMinuto(v.desde)} a {horaMinuto(v.hasta)}</Box>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
              <Chip size="small" variant="outlined" color={e.color} label={e.texto} />
              {v.estado === 'esperada' && !vencida && <Button size="small" variant="outlined" onClick={() => acciones.ingresoInvitacion(v, 'Manual')}>Dejar pasar</Button>}
              {v.estado === 'adentro' && <Button size="small" variant="outlined" onClick={() => acciones.salidaInvitacion(v)}>Registrar salida</Button>}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}

import { Box, Button, Chip, Paper, Typography } from '@mui/material';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { horaMinuto } from '../../utils/formato';
import PlacaUnidad from '../marca/PlacaUnidad';

const COLOR = { Esperada: 'warning', Adentro: 'success', Salió: 'default', Cancelada: 'default' };

// Visitas con invitación para hoy. El ingreso manual sirve cuando el QR no se puede leer.
export default function VisitasHoy() {
  const { visitasHoy, unidadPorId, acciones } = useConserjeria();
  const ahora = new Date();
  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
        <Typography variant="h6" component="h2">Visitas de hoy</Typography>
        <Typography variant="body2" color="text.secondary">{visitasHoy.filter((v) => v.estado === 'Esperada').length} por llegar · {visitasHoy.filter((v) => v.estado === 'Adentro').length} adentro</Typography>
      </Box>
      {visitasHoy.length === 0 && <Typography color="text.secondary" sx={{ p: 2.5 }}>No hay visitas con invitación para hoy.</Typography>}
      {visitasHoy.map((v, i) => {
        const u = unidadPorId[v.id_unidad];
        const vencida = v.estado === 'Esperada' && ahora > new Date(v.fecha_hasta);
        const e = vencida ? { texto: 'Vencida', color: 'default' } : { texto: v.estado, color: COLOR[v.estado] };
        return (
          <Box key={v.id_invitacion} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '64px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', opacity: ['Salió', 'Cancelada'].includes(v.estado) || vencida ? 0.6 : 1 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{horaMinuto(v.fecha_desde)}</Typography>
              <Typography variant="caption" color="text.secondary">a {horaMinuto(v.fecha_hasta)}</Typography>
            </Box>
            <PlacaUnidad unidad={u} size="sm" />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700 }}>{v.visitante}</Typography>
              <Typography variant="body2" color="text.secondary">
                {v.tipo} de {residentes[v.id_unidad] ?? 'la unidad'}{v.patente ? ` · ${v.patente}` : ''}
                <Box component="span" sx={{ display: { sm: 'none' } }}> · {horaMinuto(v.fecha_desde)} a {horaMinuto(v.fecha_hasta)}</Box>
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
              <Chip size="small" variant="outlined" color={e.color} label={e.texto} />
              {v.estado === 'Esperada' && !vencida && <Button size="small" variant="outlined" onClick={() => acciones.ingresoInvitacion(v, 'Manual')}>Dejar pasar</Button>}
              {v.estado === 'Adentro' && <Button size="small" variant="outlined" onClick={() => acciones.salidaInvitacion(v)}>Registrar salida</Button>}
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}

import { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { hoyTexto, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import { espaciosActivos, hora } from '../../utils/espacios';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

const DESDE = 7;
const HASTA = 24;
const aHoras = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };
const pos = (horas) => `${((Math.min(Math.max(horas, DESDE), HASTA) - DESDE) / (HASTA - DESDE)) * 100}%`;
// Valores de `reservas.estado_reserva` que ve la garita
const ESTADO = {
  Aprobada: { texto: 'Por entregar', color: 'warning' },
  Entregado: { texto: 'En uso', color: 'info' },
  Devuelto: { texto: 'Devuelto', color: 'success' },
};

// Franja horaria del día con cada reserva y una línea en la hora actual.
function Franja({ reservas, ahora }) {
  return (
    <Box sx={{ position: 'relative', height: 30, borderRadius: 1.5, bgcolor: 'background.default', border: 1, borderColor: 'divider' }} aria-hidden>
      {reservas.map((r) => (
        <Box key={r.id_reserva} sx={{
          position: 'absolute', top: 3, bottom: 3, left: pos(aHoras(r.hora_inicio)), width: `calc(${pos(aHoras(r.hora_fin))} - ${pos(aHoras(r.hora_inicio))})`,
          borderRadius: 1, bgcolor: r.estado_reserva === 'Devuelto' ? 'action.disabledBackground' : 'primary.main',
        }} />
      ))}
      <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: pos(ahora), width: 2, bgcolor: 'error.main' }} />
      {[9, 12, 15, 18, 21].map((h) => (
        <Typography key={h} variant="caption" sx={{ position: 'absolute', top: '100%', left: pos(h), transform: 'translateX(-50%)', color: 'text.secondary', fontSize: '0.65rem' }}>{h}:00</Typography>
      ))}
    </Box>
  );
}

function DialogoRecibir({ reserva, nombre, onClose, onRecibir }) {
  const [estado, setEstado] = useState('ok');
  const [detalle, setDetalle] = useState('');
  const valido = estado === 'ok' || detalle.trim();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Recibir {nombre}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <ToggleButtonGroup exclusive fullWidth value={estado} onChange={(_, v) => v && setEstado(v)}>
          <ToggleButton value="ok">Sin novedades</ToggleButton>
          <ToggleButton value="problema">Con observaciones</ToggleButton>
        </ToggleButtonGroup>
        {estado === 'problema' && (
          <TextField autoFocus label="Qué encontraste" value={detalle} onChange={(e) => setDetalle(e.target.value)} multiline minRows={2} helperText="Queda registrado y le llega a Administración." />
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!valido} onClick={() => { onRecibir(reserva, estado === 'ok' ? 'Sin novedades' : detalle.trim()); onClose(); }}>Recibir</Button>
      </DialogActions>
    </Dialog>
  );
}

// Espacios comunes del día: quién los tiene reservados, entregarlos y recibirlos.
export default function Espacios() {
  const { comunidad } = useSesion();
  const { reservasHoy, unidadPorId, espacioDe, acciones } = useConserjeria();
  const [recibir, setRecibir] = useState(null);
  const [ahora, setAhora] = useState(() => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; });
  useEffect(() => {
    const t = setInterval(() => { const d = new Date(); setAhora(d.getHours() + d.getMinutes() / 60); }, 60000);
    return () => clearInterval(t);
  }, []);
  const espacios = espaciosActivos(comunidad);

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado contexto={`${comunidad.nombre} · ${hoyTexto()}`} titulo="Espacios del día" descripcion="Entrega el espacio al residente que lo reservó y recíbelo al terminar, revisando que quede en orden." />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {espacios.length === 0 && <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">La comunidad no tiene espacios comunes registrados.</Typography></Paper>}
        {espacios.map((esp) => {
          const lista = reservasHoy.filter((r) => r.id_espacio === esp.id_espacio).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
          const enUso = lista.find((r) => r.estado_reserva === 'Entregado');
          return (
            <Paper key={esp.id_espacio} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h2">{esp.nombre}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: enUso ? 'info.main' : 'text.secondary' }}>
                  {enUso ? `En uso por ${nombreUnidad(unidadPorId[enUso.id_unidad])}` : lista.length ? `${lista.length} ${lista.length === 1 ? 'reserva' : 'reservas'} hoy` : 'Libre todo el día'}
                </Typography>
              </Box>
              <Box sx={{ pb: 1.5 }}><Franja reservas={lista} ahora={ahora} /></Box>
              {lista.map((r) => {
                const u = unidadPorId[r.id_unidad];
                return (
                  <Box key={r.id_reserva} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '110px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'block' } }}>{hora(r.hora_inicio)} a {hora(r.hora_fin)}</Typography>
                    <PlacaUnidad unidad={u} size="sm" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{residentes[r.id_unidad] ?? nombreUnidad(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Box component="span" sx={{ display: { sm: 'none' } }}>{hora(r.hora_inicio)} a {hora(r.hora_fin)} · </Box>
                        {r.cantidad_invitados ? `${r.cantidad_invitados} invitados` : 'Sin invitados'}{r.observacion ? ` · ${r.observacion}` : ''}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                      <Chip size="small" variant="outlined" color={ESTADO[r.estado_reserva].color} label={ESTADO[r.estado_reserva].texto} />
                      {r.estado_reserva === 'Aprobada' && <Button size="small" variant="contained" disabled={Boolean(enUso)} onClick={() => acciones.entregarEspacio(r)}>Entregar</Button>}
                      {r.estado_reserva === 'Entregado' && <Button size="small" variant="contained" onClick={() => setRecibir(r)}>Recibir</Button>}
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          );
        })}
      </Box>
      {recibir && <DialogoRecibir reserva={recibir} nombre={espacioDe(recibir)} onClose={() => setRecibir(null)} onRecibir={acciones.recibirEspacio} />}
    </Box>
  );
}

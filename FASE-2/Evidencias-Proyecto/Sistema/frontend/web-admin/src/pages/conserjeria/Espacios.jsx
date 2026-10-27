import { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { hoyTexto, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

const DESDE = 7;
const HASTA = 24;
const aHoras = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };
const pos = (horas) => `${((Math.min(Math.max(horas, DESDE), HASTA) - DESDE) / (HASTA - DESDE)) * 100}%`;
const ESTADO = {
  confirmada: { texto: 'Por entregar', color: 'warning' },
  entregado: { texto: 'En uso', color: 'info' },
  devuelto: { texto: 'Devuelto', color: 'success' },
};

// Franja horaria del día con cada reserva y una línea en la hora actual.
function Franja({ reservas, ahora }) {
  return (
    <Box sx={{ position: 'relative', height: 30, borderRadius: 1.5, bgcolor: 'background.default', border: 1, borderColor: 'divider' }} aria-hidden>
      {reservas.map((r) => (
        <Box key={r.id} sx={{
          position: 'absolute', top: 3, bottom: 3, left: pos(aHoras(r.desde)), width: `calc(${pos(aHoras(r.hasta))} - ${pos(aHoras(r.desde))})`,
          borderRadius: 1, bgcolor: r.estado === 'devuelto' ? 'action.disabledBackground' : 'primary.main',
        }} />
      ))}
      <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: pos(ahora), width: 2, bgcolor: 'error.main' }} />
      {[9, 12, 15, 18, 21].map((h) => (
        <Typography key={h} variant="caption" sx={{ position: 'absolute', top: '100%', left: pos(h), transform: 'translateX(-50%)', color: 'text.secondary', fontSize: '0.65rem' }}>{h}:00</Typography>
      ))}
    </Box>
  );
}

function DialogoRecibir({ reserva, onClose, onRecibir }) {
  const [estado, setEstado] = useState('ok');
  const [detalle, setDetalle] = useState('');
  const valido = estado === 'ok' || detalle.trim();
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Recibir {reserva.espacio}</DialogTitle>
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
  const { reservasHoy, unidadPorId, acciones } = useConserjeria();
  const [recibir, setRecibir] = useState(null);
  const [ahora, setAhora] = useState(() => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; });
  useEffect(() => {
    const t = setInterval(() => { const d = new Date(); setAhora(d.getHours() + d.getMinutes() / 60); }, 60000);
    return () => clearInterval(t);
  }, []);
  const espacios = comunidad.espaciosComunes ?? [];

  return (
    <Box sx={{ maxWidth: 1200 }}>
      <Encabezado contexto={`${comunidad.nombre} · ${hoyTexto()}`} titulo="Espacios del día" descripcion="Entrega el espacio al residente que lo reservó y recíbelo al terminar, revisando que quede en orden." />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {espacios.length === 0 && <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}><Typography color="text.secondary">La comunidad no tiene espacios comunes registrados.</Typography></Paper>}
        {espacios.map((esp) => {
          const lista = reservasHoy.filter((r) => r.espacio === esp).sort((a, b) => a.desde.localeCompare(b.desde));
          const enUso = lista.find((r) => r.estado === 'entregado');
          return (
            <Paper key={esp} variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: 'grid', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h2">{esp}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: enUso ? 'info.main' : 'text.secondary' }}>
                  {enUso ? `En uso por ${nombreUnidad(unidadPorId[enUso.idUnidad])}` : lista.length ? `${lista.length} ${lista.length === 1 ? 'reserva' : 'reservas'} hoy` : 'Libre todo el día'}
                </Typography>
              </Box>
              <Box sx={{ pb: 1.5 }}><Franja reservas={lista} ahora={ahora} /></Box>
              {lista.map((r) => {
                const u = unidadPorId[r.idUnidad];
                return (
                  <Box key={r.id} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '110px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
                    <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', display: { xs: 'none', sm: 'block' } }}>{r.desde} a {r.hasta}</Typography>
                    <PlacaUnidad tipo={u.tipo} numero={u.numero} size="sm" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{residentes[r.idUnidad] ?? nombreUnidad(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Box component="span" sx={{ display: { sm: 'none' } }}>{r.desde} a {r.hasta} · </Box>
                        {r.invitados ? `${r.invitados} invitados` : 'Sin invitados'}{r.observacion ? ` · ${r.observacion}` : ''}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                      <Chip size="small" variant="outlined" color={ESTADO[r.estado].color} label={ESTADO[r.estado].texto} />
                      {r.estado === 'confirmada' && <Button size="small" variant="contained" disabled={Boolean(enUso)} onClick={() => acciones.entregarEspacio(r)}>Entregar</Button>}
                      {r.estado === 'entregado' && <Button size="small" variant="contained" onClick={() => setRecibir(r)}>Recibir</Button>}
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          );
        })}
      </Box>
      {recibir && <DialogoRecibir reserva={recibir} onClose={() => setRecibir(null)} onRecibir={acciones.recibirEspacio} />}
    </Box>
  );
}

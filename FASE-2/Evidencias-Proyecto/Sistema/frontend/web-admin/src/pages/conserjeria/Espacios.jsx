import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as reservasApi from '../../api/reservas';
import { useConsulta } from '../../api/useConsulta';
import { fecha, hoyTexto, nombreUnidad } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';
import { MAX_MOTIVO, hora } from '../../utils/espacios';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

const DESDE = 7;
const HASTA = 24;
const aHoras = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h + m / 60; };
const pos = (horas) => `${((Math.min(Math.max(horas, DESDE), HASTA) - DESDE) / (HASTA - DESDE)) * 100}%`;
const horaActual = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
// Lo que ve la garita según el `estado` de la reserva
const ESTADO = {
  Pendiente: { texto: 'Por entregar', color: 'warning' },
  Aprobada: { texto: 'Por entregar', color: 'warning' },
  Entregado: { texto: 'En uso', color: 'info' },
  Devuelto: { texto: 'Devuelto', color: 'success' },
};

// Franja horaria del día con cada reserva y una línea en la hora actual.
function Franja({ reservas, ahora }) {
  return (
    <Box sx={{ position: 'relative', height: 30, borderRadius: 1.5, bgcolor: 'background.default', border: 1, borderColor: 'divider' }} aria-hidden>
      {reservas.map((r) => (
        <Box key={r.idReserva} sx={{
          position: 'absolute', top: 3, bottom: 3, left: pos(aHoras(r.horaInicio)), width: `calc(${pos(aHoras(r.horaFin))} - ${pos(aHoras(r.horaInicio))})`,
          borderRadius: 1, bgcolor: r.estado === 'Devuelto' ? 'action.disabledBackground' : 'primary.main',
        }} />
      ))}
      <Box sx={{ position: 'absolute', top: -4, bottom: -4, left: pos(ahora), width: 2, bgcolor: 'error.main' }} />
      {[9, 12, 15, 18, 21].map((h) => (
        <Typography key={h} variant="caption" sx={{ position: 'absolute', top: '100%', left: pos(h), transform: 'translateX(-50%)', color: 'text.secondary', fontSize: '0.65rem' }}>{h}:00</Typography>
      ))}
    </Box>
  );
}

// Recibir el espacio (POST reservas/:id/recepcion): sin observaciones el backend guarda «Sin novedades»
function DialogoRecibir({ reserva, onClose, onRecibido }) {
  const { avisar } = useAviso();
  const [estado, setEstado] = useState('ok');
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const valido = estado === 'ok' || detalle.trim();
  const recibir = async () => {
    setEnviando(true);
    setError(null);
    try {
      await reservasApi.recibirEspacio(reserva.idReserva, estado === 'ok' ? undefined : detalle.trim());
      avisar(`${reserva.espacio} recibido.`);
      onRecibido();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Recibir {reserva.espacio}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <ToggleButtonGroup exclusive fullWidth value={estado} onChange={(_, v) => v && setEstado(v)}>
          <ToggleButton value="ok">Sin novedades</ToggleButton>
          <ToggleButton value="problema">Con observaciones</ToggleButton>
        </ToggleButtonGroup>
        {estado === 'problema' && (
          <TextField
            autoFocus label="Qué encontraste" value={detalle} onChange={(e) => setDetalle(e.target.value)} multiline minRows={2}
            helperText={`Queda registrado y lo ve la administración. ${detalle.length}/${MAX_MOTIVO}`}
            slotProps={{ htmlInput: { maxLength: MAX_MOTIVO } }}
          />
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={!valido} loading={enviando} onClick={recibir}>Recibir</Button>
      </DialogActions>
    </Dialog>
  );
}

// Espacios comunes del día (GET reservas/hoy): quién los tiene reservados, entregarlos y recibirlos.
// También aparecen los que se entregaron un día anterior y aún no se reciben.
export default function Espacios() {
  const { comunidad } = useSesion();
  const { avisar, avisarError } = useAviso();
  const { datos, cargando, error, recargar } = useConsulta(reservasApi.reservasDelDia, [comunidad.idRed]);
  const [recibir, setRecibir] = useState(null);
  const [entregando, setEntregando] = useState(null);
  const [ahora, setAhora] = useState(horaActual);
  // Cada minuto se mueve la línea de la hora y se vuelven a pedir las reservas (pueden llegar nuevas desde la app)
  useEffect(() => {
    const t = setInterval(() => { setAhora(horaActual()); recargar(); }, 60000);
    return () => clearInterval(t);
  }, [recargar]);

  const entregar = async (r) => {
    setEntregando(r.idReserva);
    try {
      await reservasApi.entregarEspacio(r.idReserva);
      avisar(`${r.espacio} entregado a ${nombreUnidad(conTipo(r.unidad, comunidad))}.`);
      recargar();
    } catch (err) {
      avisarError(err.message);
    } finally {
      setEntregando(null);
    }
  };

  const encabezado = (
    <Encabezado contexto={`${comunidad.nombre} · ${hoyTexto()}`} titulo="Espacios del día" descripcion="Entrega el espacio al residente que lo reservó y recíbelo al terminar, revisando que quede en orden." />
  );
  if (!datos) return <Box sx={{ maxWidth: 1200 }}>{encabezado}<EstadoCarga cargando={cargando} error={error} onReintentar={recargar} /></Box>;

  const fila = (r, enUso, deOtroDia) => {
    const u = conTipo(r.unidad, comunidad);
    const e = ESTADO[r.estado] ?? { texto: r.estado, color: 'default' };
    return (
      <Box key={r.idReserva} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '120px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{hora(r.horaInicio)} a {hora(r.horaFin)}</Typography>
          {deOtroDia && <Typography variant="body2" color="error.main">{fecha(r.fecha)}</Typography>}
        </Box>
        {u ? <PlacaUnidad unidad={u} size="sm" /> : <span />}
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{r.usuario?.nombre ?? nombreUnidad(u)}</Typography>
          <Typography variant="body2" color="text.secondary">
            <Box component="span" sx={{ display: { sm: 'none' } }}>{deOtroDia ? `${fecha(r.fecha)} · ` : ''}{hora(r.horaInicio)} a {hora(r.horaFin)} · </Box>
            {r.invitados ? `${r.invitados} invitados` : 'Sin invitados'}{r.observacionesRecepcion ? ` · ${r.observacionesRecepcion}` : ''}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
          <Chip size="small" variant="outlined" color={e.color} label={deOtroDia ? 'Sin recibir' : e.texto} />
          {r.estado === 'Aprobada' && !deOtroDia && (
            <Button size="small" variant="contained" disabled={Boolean(enUso)} loading={entregando === r.idReserva} onClick={() => entregar(r)}>Entregar</Button>
          )}
          {r.estado === 'Entregado' && <Button size="small" variant="contained" onClick={() => setRecibir(r)}>Recibir</Button>}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200 }}>
      {encabezado}
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {datos.espacios.length === 0 && <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">La comunidad no tiene espacios comunes registrados.</Typography></Paper>}
        {datos.espacios.map((esp) => {
          const enUso = esp.reservas.find((r) => r.idReserva === esp.enUso) ?? esp.porRecibir.find((r) => r.estado === 'Entregado');
          return (
            <Paper key={esp.idEspacio} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography variant="h6" component="h2">{esp.nombre}{!esp.activo && <Chip size="small" label="Dado de baja" sx={{ ml: 1 }} />}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: enUso ? 'info.main' : 'text.secondary' }}>
                  {enUso ? `En uso por ${nombreUnidad(conTipo(enUso.unidad, comunidad))}` : esp.reservas.length ? `${esp.reservas.length} ${esp.reservas.length === 1 ? 'reserva' : 'reservas'} hoy` : 'Libre todo el día'}
                </Typography>
              </Box>
              {esp.porRecibir.length > 0 && (
                <Alert severity="warning" variant="outlined">Se entregó un día anterior y todavía no se recibe. Recíbelo antes de entregarlo de nuevo.</Alert>
              )}
              {esp.porRecibir.map((r) => fila(r, enUso, true))}
              <Box sx={{ pb: 1.5 }}><Franja reservas={esp.reservas} ahora={ahora} /></Box>
              {esp.reservas.map((r) => fila(r, enUso, false))}
            </Paper>
          );
        })}
      </Box>
      {recibir && <DialogoRecibir reserva={recibir} onClose={() => setRecibir(null)} onRecibido={recargar} />}
    </Box>
  );
}

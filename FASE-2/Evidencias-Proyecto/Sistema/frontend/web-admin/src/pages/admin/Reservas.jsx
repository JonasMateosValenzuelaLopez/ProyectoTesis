import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as reservasApi from '../../api/reservas';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { fechaCompleta, nombreUnidad } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';
import { MAX_MOTIVO, hora, origenCancelacion, puedeCancelarAdministracion } from '../../utils/espacios';
import { hoyISO } from '../../utils/finanzas';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

// `estado` de la reserva como lo entrega la API (estadoVisible del backend)
const ESTADO = {
  Pendiente: { texto: 'Pendiente', color: 'warning' },
  Aprobada: { texto: 'Confirmada', color: 'success' },
  Rechazada: { texto: 'Rechazada', color: 'error' },
  Entregado: { texto: 'En uso', color: 'info' },
  Devuelto: { texto: 'Devuelto', color: 'default' },
  Cancelada: { texto: 'Cancelada', color: 'error' },
};
const diaSemana = new Intl.DateTimeFormat('es-CL', { weekday: 'long' });

function DialogoCancelar({ reserva, onClose, onCancelada }) {
  const { avisar } = useAviso();
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await reservasApi.cancelarReserva(reserva.idReserva, motivo.trim());
      avisar(r.residentesAvisados ? `Reserva cancelada. Se avisó por correo a ${r.residentesAvisados} ${r.residentesAvisados === 1 ? 'persona' : 'personas'}.` : 'Reserva cancelada.');
      onCancelada();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Cancelar reserva</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography color="text.secondary">{reserva.espacio} · {fechaCompleta(reserva.fecha)} · {hora(reserva.horaInicio)} a {hora(reserva.horaFin)}</Typography>
        <TextField
          autoFocus required label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} multiline minRows={2}
          helperText={`El residente lo recibe en la app y por correo. ${motivo.length}/${MAX_MOTIVO}`}
          slotProps={{ htmlInput: { maxLength: MAX_MOTIVO } }}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Volver</Button>
        <Button variant="contained" color="error" disabled={!motivo.trim()} loading={enviando} onClick={confirmar}>Cancelar reserva</Button>
      </DialogActions>
    </Dialog>
  );
}

// Reservas de espacios comunes (GET reservas: desde hoy). Los residentes reservan desde la app; la administración
// las revisa y puede cancelar una con motivo. Como en la API, solo se cancela una reserva vigente, no entregada y que no empieza.
export default function Reservas() {
  const { comunidad } = useSesion();
  const [idEspacio, setIdEspacio] = useState('');
  const espacios = useConsulta(admin.listarEspacios, [comunidad.idRed]);
  const reservas = useConsulta(() => reservasApi.listarReservas(idEspacio || undefined), [comunidad.idRed, idEspacio]);
  const [cancelar, setCancelar] = useState(null);
  const hoy = hoyISO();

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Reservas"
      descripcion="Los residentes reservan desde la app. Si cancelas una reserva, el residente recibe el motivo."
      acciones={(
        <TextField select size="small" label="Espacio" value={idEspacio} onChange={(e) => setIdEspacio(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">Todos los espacios</MenuItem>
          {(espacios.datos ?? []).map((e) => <MenuItem key={e.idEspacio} value={e.idEspacio}>{e.nombre}</MenuItem>)}
        </TextField>
      )}
    />
  );
  if (!reservas.datos) {
    return <Box sx={{ maxWidth: 1000 }}>{encabezado}<EstadoCarga cargando error={reservas.error} onReintentar={reservas.recargar} /></Box>;
  }

  const lista = reservas.datos;
  const dias = [...new Set(lista.map((r) => r.fecha))];

  return (
    <Box sx={{ maxWidth: 1000 }}>
      {encabezado}
      {dias.length === 0 && <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">No hay reservas próximas.</Typography></Paper>}
      <Box sx={{ display: 'grid', gap: 2.5, opacity: reservas.cargando ? 0.6 : 1 }}>
        {dias.map((dia) => (
          <Box key={dia} sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="overline" component="h2" color="text.secondary">
              {dia === hoy ? 'Hoy' : diaSemana.format(new Date(`${dia}T12:00:00`))} · {fechaCompleta(dia)}
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
              {lista.filter((r) => r.fecha === dia).map((r, i) => {
                const u = conTipo(r.unidad, comunidad);
                const e = ESTADO[r.estado] ?? { texto: r.estado, color: 'default' };
                return (
                  <Box key={r.idReserva} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '130px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', opacity: r.estado === 'Cancelada' || r.estado === 'Rechazada' ? 0.6 : 1 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Typography sx={{ fontWeight: 800 }}>{r.espacio}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{hora(r.horaInicio)} a {hora(r.horaFin)}</Typography>
                    </Box>
                    {u ? <PlacaUnidad unidad={u} size="sm" /> : <span />}
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{r.usuario?.nombre ?? nombreUnidad(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Box component="span" sx={{ display: { sm: 'none' } }}>{r.espacio} · {hora(r.horaInicio)} a {hora(r.horaFin)} · </Box>
                        {u ? `${nombreUnidad(u)} · ` : ''}{r.invitados ? `${r.invitados} invitados` : 'Sin invitados'}
                        {r.estado === 'Devuelto' && r.observacionesRecepcion ? ` · ${r.observacionesRecepcion}` : ''}
                      </Typography>
                      {r.estado === 'Cancelada' && (
                        <Typography variant="body2" color="text.secondary">
                          Cancelada por {origenCancelacion(r)}{r.motivoCancelacion ? `: ${r.motivoCancelacion}` : ''}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                      <Chip size="small" variant="outlined" color={e.color} label={e.texto} />
                      {puedeCancelarAdministracion(r) && <Button size="small" color="error" onClick={() => setCancelar(r)}>Cancelar</Button>}
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          </Box>
        ))}
      </Box>

      {cancelar && <DialogoCancelar reserva={cancelar} onClose={() => setCancelar(null)} onCancelada={reservas.recargar} />}
    </Box>
  );
}

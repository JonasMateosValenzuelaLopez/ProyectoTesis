import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { fechaCompleta, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';

const ESTADO = {
  confirmada: { texto: 'Confirmada', color: 'success' },
  entregado: { texto: 'En uso', color: 'info' },
  devuelto: { texto: 'Devuelto', color: 'default' },
  cancelada: { texto: 'Cancelada', color: 'error' },
};
const diaSemana = new Intl.DateTimeFormat('es-CL', { weekday: 'long' });

// Reservas de espacios comunes: los residentes reservan desde la app; Administración
// las revisa y puede cancelar una con motivo (el residente recibe el aviso).
export default function Reservas() {
  const { comunidad } = useSesion();
  const { reservas, hoy, unidadPorId, acciones } = useConserjeria();
  const [espacio, setEspacio] = useState('todos');
  const [cancelar, setCancelar] = useState(null);
  const [motivo, setMotivo] = useState('');

  const proximas = reservas
    .filter((r) => r.fecha >= hoy && (espacio === 'todos' || r.espacio === espacio))
    .sort((a, b) => `${a.fecha}${a.desde}`.localeCompare(`${b.fecha}${b.desde}`));
  const dias = [...new Set(proximas.map((r) => r.fecha))];

  const confirmar = () => {
    acciones.cancelarReserva(cancelar, motivo.trim());
    setCancelar(null);
    setMotivo('');
  };

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Reservas"
        descripcion="Los residentes reservan desde la app. Si cancelas una reserva, el residente recibe el motivo."
        acciones={(
          <TextField select size="small" label="Espacio" value={espacio} onChange={(e) => setEspacio(e.target.value)} sx={{ minWidth: 200 }}>
            <MenuItem value="todos">Todos los espacios</MenuItem>
            {(comunidad.espaciosComunes ?? []).map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
          </TextField>
        )}
      />

      {dias.length === 0 && <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">No hay reservas próximas.</Typography></Paper>}
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {dias.map((dia) => (
          <Box key={dia} sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="overline" component="h2" color="text.secondary">
              {dia === hoy ? 'Hoy' : diaSemana.format(new Date(`${dia}T12:00:00`))} · {fechaCompleta(dia)}
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
              {proximas.filter((r) => r.fecha === dia).map((r, i) => {
                const u = unidadPorId[r.idUnidad];
                return (
                  <Box key={r.id} sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto 1fr', sm: '120px auto 1fr auto' }, gap: { xs: 1.5, sm: 2 }, alignItems: 'center', px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', opacity: r.estado === 'cancelada' ? 0.6 : 1 }}>
                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                      <Typography sx={{ fontWeight: 800 }}>{r.espacio}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.desde} a {r.hasta}</Typography>
                    </Box>
                    <PlacaUnidad tipo={u.tipo} numero={u.numero} size="sm" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }}>{residentes[r.idUnidad] ?? nombreUnidad(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        <Box component="span" sx={{ display: { sm: 'none' } }}>{r.espacio} · {r.desde} a {r.hasta} · </Box>
                        {r.invitados ? `${r.invitados} invitados` : 'Sin invitados'}{r.observacion ? ` · ${r.observacion}` : ''}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                      <Chip size="small" variant="outlined" color={ESTADO[r.estado].color} label={ESTADO[r.estado].texto} />
                      {r.estado === 'confirmada' && <Button size="small" color="error" onClick={() => setCancelar(r)}>Cancelar</Button>}
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          </Box>
        ))}
      </Box>

      <Dialog open={Boolean(cancelar)} onClose={() => setCancelar(null)} fullWidth maxWidth="xs">
        <DialogTitle>Cancelar reserva</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <Typography color="text.secondary">{cancelar?.espacio} · {cancelar && fechaCompleta(cancelar.fecha)} · {cancelar?.desde} a {cancelar?.hasta}</Typography>
          <TextField autoFocus required label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} multiline minRows={2} helperText="El residente lo recibe en la app y por correo." />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelar(null)}>Volver</Button>
          <Button variant="contained" color="error" disabled={!motivo.trim()} onClick={confirmar}>Cancelar reserva</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

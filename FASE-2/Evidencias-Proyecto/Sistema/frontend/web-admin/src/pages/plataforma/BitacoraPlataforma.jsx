import { useState } from 'react';
import { Box, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { usePlataforma } from '../../context/PlataformaContext';
import { fechaHora, nombreCorto } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';

// Todo lo que hace el equipo EntreCasas queda registrado: crear, suspender, cambiar
// módulos, abrir fichas en modo soporte, reenviar accesos y bloquear cuentas.
export default function BitacoraPlataforma() {
  const { bitacoraPlataforma, cuentas } = useSesion();
  const actor = (id) => nombreCorto(cuentas.find((c) => c.id_usuario === id)) || 'Equipo EntreCasas';
  const { redes, redPorId } = usePlataforma();
  const [red, setRed] = useState('todas');

  const lista = bitacoraPlataforma.filter((b) => red === 'todas' || (red === 'ninguna' ? b.id_red == null : b.id_red === red));

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Encabezado titulo="Bitácora" descripcion="Registro de las acciones del equipo EntreCasas sobre las comunidades y las cuentas." />
      <TextField select size="small" label="Comunidad" value={red} onChange={(e) => setRed(e.target.value)} sx={{ minWidth: 260, mb: 2 }}>
        <MenuItem value="todas">Todas</MenuItem>
        <MenuItem value="ninguna">Sin comunidad (cuentas)</MenuItem>
        {redes.map((r) => <MenuItem key={r.id_red} value={r.id_red}>{r.nombre}</MenuItem>)}
      </TextField>
      <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
        {lista.map((b, i) => (
          <Box key={b.id_bitacora} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '150px 1fr' }, gap: { xs: 0.25, sm: 2 }, px: 2.5, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fechaHora(b.fecha)}</Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography><b>{actor(b.id_usuario)}</b> · {b.accion}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                {b.detalle}{b.id_red != null && redPorId[b.id_red] && !b.detalle.includes(redPorId[b.id_red].nombre) ? ` · ${redPorId[b.id_red].nombre}` : ''}
              </Typography>
            </Box>
          </Box>
        ))}
        {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 3 }}>Sin registros.</Typography>}
      </Paper>
    </Box>
  );
}

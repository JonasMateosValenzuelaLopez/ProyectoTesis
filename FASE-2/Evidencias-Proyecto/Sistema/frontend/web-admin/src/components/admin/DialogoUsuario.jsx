import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAdmin, CARGOS_UNICOS } from '../../context/AdminContext';
import { roles } from '../../tokens';
import { fecha, nombreUnidad } from '../../utils/formato';
import SelloCargo from '../marca/SelloCargo';
import PlacaUnidad from '../marca/PlacaUnidad';

const ASIGNABLES = ['presidente', 'tesorero', 'secretario', 'conserje', 'administrador'];
const RELACION = { propietario: 'Propietario', arrendatario: 'Arrendatario' };

function Dato({ etiqueta, children }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{children || '—'}</Typography>
    </Box>
  );
}

// Ficha de una persona: datos, unidad, cargos (fijos y por comunidad) y estado de la cuenta.
export default function DialogoUsuario({ idUsuario, onClose }) {
  const { usuarioPorId, unidadPorId, usuarios, acciones } = useAdmin();
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [hasta, setHasta] = useState('');
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const u = usuarioPorId[idUsuario];
  if (!u) return null;

  const activo = u.estado !== 'desactivado';
  const disponibles = ASIGNABLES.filter((c) => !u.cargos.some((x) => x.cargo === c));
  const reemplaza = nuevoCargo && CARGOS_UNICOS.includes(nuevoCargo)
    ? usuarios.find((x) => x.id !== u.id && x.estado !== 'desactivado' && x.cargos.some((c) => c.cargo === nuevoCargo))
    : null;

  const asignar = () => {
    acciones.asignarCargo(u.id, nuevoCargo, hasta);
    setNuevoCargo('');
    setHasta('');
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        {u.nombre}
        <Typography color="text.secondary">{u.rut}</Typography>
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5 }}>
        {u.estado === 'invitado' && (
          <Alert severity="warning" variant="outlined" action={<Button color="inherit" size="small" onClick={() => acciones.reenviarInvitacion(u.id)}>Reenviar</Button>}>
            Todavía no acepta la invitación.
          </Alert>
        )}
        {!activo && <Alert severity="error" variant="outlined">Cuenta desactivada. No puede entrar a la comunidad.</Alert>}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Dato etiqueta="Correo">{u.correo}</Dato>
          <Dato etiqueta="Teléfono">{u.telefono}</Dato>
          <Dato etiqueta="En la comunidad desde">{fecha(u.registro)} {u.registro.slice(0, 4)}</Dato>
        </Box>

        {u.residencias.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="subtitle2" component="h3">Vivienda</Typography>
            {u.residencias.map((r) => {
              const unidad = unidadPorId[r.idUnidad];
              return (
                <Box key={r.idUnidad} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="sm" />
                  <Typography>{nombreUnidad(unidad)} · {RELACION[r.relacion]}</Typography>
                </Box>
              );
            })}
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: 1.25 }}>
          <Typography variant="subtitle2" component="h3">Cargos en esta comunidad</Typography>
          {u.cargos.length === 0 && <Typography color="text.secondary">Sin cargos. Usa la app como residente.</Typography>}
          {u.cargos.map((c) => (
            <Box key={c.cargo} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between', border: 1, borderColor: 'divider', borderRadius: 2, px: 1.5, py: 1 }}>
              <Box>
                <SelloCargo cargo={c.cargo} conTexto />
                <Typography variant="body2" color="text.secondary">Desde {fecha(c.desde)} {c.desde.slice(0, 4)}{c.hasta ? ` hasta ${fecha(c.hasta)} ${c.hasta.slice(0, 4)}` : ''}</Typography>
              </Box>
              <Tooltip title={`Quitar cargo de ${roles[c.cargo].label}`}>
                <IconButton aria-label={`Quitar cargo de ${roles[c.cargo].label}`} onClick={() => acciones.quitarCargo(u.id, c.cargo)}><CloseIcon /></IconButton>
              </Tooltip>
            </Box>
          ))}

          {activo && disponibles.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 170px auto' }, alignItems: 'start', mt: 0.5 }}>
              <TextField select size="small" label="Asignar cargo" value={nuevoCargo} onChange={(e) => setNuevoCargo(e.target.value)}>
                {disponibles.map((c) => <MenuItem key={c} value={c}>{roles[c].label}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Hasta (opcional)" value={hasta} onChange={(e) => setHasta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
              <Button variant="contained" disabled={!nuevoCargo} onClick={asignar}>Asignar</Button>
              {reemplaza && (
                <Typography variant="body2" color="warning.main" sx={{ gridColumn: '1 / -1' }}>
                  {reemplaza.nombre} es {roles[nuevoCargo].label} ahora. Al asignar, deja el cargo.
                </Typography>
              )}
            </Box>
          )}
          {u.cargos.some((c) => ['presidente', 'tesorero', 'secretario'].includes(c.cargo)) && (
            <Typography variant="body2" color="text.secondary">Los cambios de cargo quedan en la bitácora que revisa el Presidente.</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {activo ? (
          confirmarBaja ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2">Pierde el acceso y sus cargos.</Typography>
              <Button color="error" variant="contained" onClick={() => { acciones.cambiarEstado(u.id, 'desactivado'); setConfirmarBaja(false); }}>Desactivar</Button>
              <Button onClick={() => setConfirmarBaja(false)}>No</Button>
            </Box>
          ) : (
            <Button color="error" onClick={() => setConfirmarBaja(true)}>Desactivar cuenta</Button>
          )
        ) : (
          <Button onClick={() => acciones.cambiarEstado(u.id, 'activo')}>Reactivar cuenta</Button>
        )}
        <Button onClick={onClose}>Listo</Button>
      </DialogActions>
    </Dialog>
  );
}

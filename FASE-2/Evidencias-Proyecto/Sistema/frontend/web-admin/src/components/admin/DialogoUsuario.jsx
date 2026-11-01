import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useAdmin, CARGOS_UNICOS } from '../../context/AdminContext';
import { roles } from '../../tokens';
import { fecha, nombreCompleto, nombreUnidad, telefono } from '../../utils/formato';
import { residenciasActivas } from '../../config/roles';
import SelloCargo from '../marca/SelloCargo';
import PlacaUnidad from '../marca/PlacaUnidad';

const ASIGNABLES = ['presidente', 'tesorero', 'secretario', 'conserje', 'administrador'];

function Dato({ etiqueta, children }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{children || '—'}</Typography>
    </Box>
  );
}

// Ficha de una persona: datos, unidad, cargos (fijos y por comunidad) y estado de la cuenta.
export default function DialogoUsuario({ id_usuario, onClose }) {
  const { usuarioPorId, unidadPorId, usuarios, cargosVigentes, acciones } = useAdmin();
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [hasta, setHasta] = useState('');
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const u = usuarioPorId[id_usuario];
  if (!u) return null;

  const activo = u.estado !== 'Desactivado';
  const cargos = cargosVigentes(u);
  const viviendas = residenciasActivas(u);
  const disponibles = ASIGNABLES.filter((c) => !cargos.some((x) => x.cargo === c));
  const reemplaza = nuevoCargo && CARGOS_UNICOS.includes(nuevoCargo)
    ? usuarios.find((x) => x.id_usuario !== u.id_usuario && x.estado !== 'Desactivado' && cargosVigentes(x).some((c) => c.cargo === nuevoCargo))
    : null;

  const asignar = () => {
    acciones.asignarCargo(u.id_usuario, nuevoCargo, hasta);
    setNuevoCargo('');
    setHasta('');
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        {nombreCompleto(u)}
        <Typography color="text.secondary">{u.rut}</Typography>
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5 }}>
        {u.estado === 'Invitado' && (
          <Alert severity="warning" variant="outlined" action={<Button color="inherit" size="small" onClick={() => acciones.reenviarInvitacion(u.id_usuario)}>Reenviar</Button>}>
            Todavía no acepta la invitación.
          </Alert>
        )}
        {!activo && <Alert severity="error" variant="outlined">Cuenta desactivada. No puede entrar a la comunidad.</Alert>}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Dato etiqueta="Correo">{u.correo}</Dato>
          <Dato etiqueta="Teléfono">{telefono(u.telefono)}</Dato>
          <Dato etiqueta="En la comunidad desde">{fecha(u.fecha_registro)} {u.fecha_registro.slice(0, 4)}</Dato>
        </Box>

        {viviendas.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="subtitle2" component="h3">Vivienda</Typography>
            {viviendas.map((r) => {
              const unidad = unidadPorId[r.id_unidad];
              return (
                <Box key={r.id_unidad} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <PlacaUnidad unidad={unidad} size="sm" />
                  <Typography>{nombreUnidad(unidad)} · {r.relacion}</Typography>
                </Box>
              );
            })}
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: 1.25 }}>
          <Typography variant="subtitle2" component="h3">Cargos en esta comunidad</Typography>
          {cargos.length === 0 && <Typography color="text.secondary">Sin cargos. Usa la app como residente.</Typography>}
          {cargos.map((c) => (
            <Box key={c.cargo} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
              <Box>
                <SelloCargo cargo={c.cargo} conTexto />
                <Typography variant="body2" color="text.secondary">Desde {fecha(c.desde)} {c.desde.slice(0, 4)}{c.hasta ? ` hasta ${fecha(c.hasta)} ${c.hasta.slice(0, 4)}` : ''}</Typography>
              </Box>
              <Tooltip title={`Quitar cargo de ${roles[c.cargo].label}`}>
                <IconButton aria-label={`Quitar cargo de ${roles[c.cargo].label}`} onClick={() => acciones.quitarCargo(u.id_usuario, c.cargo)}><CloseIcon /></IconButton>
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
                  {nombreCompleto(reemplaza)} es {roles[nuevoCargo].label} ahora. Al asignar, deja el cargo.
                </Typography>
              )}
            </Box>
          )}
          {cargos.some((c) => ['presidente', 'tesorero', 'secretario'].includes(c.cargo)) && (
            <Typography variant="body2" color="text.secondary">Los cambios de cargo quedan en la bitácora que revisa la Presidencia.</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {activo ? (
          confirmarBaja ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2">Pierde el acceso y sus cargos.</Typography>
              <Button color="error" variant="contained" onClick={() => { acciones.cambiarEstado(u.id_usuario, 'Desactivado'); setConfirmarBaja(false); }}>Desactivar</Button>
              <Button onClick={() => setConfirmarBaja(false)}>No</Button>
            </Box>
          ) : (
            <Button color="error" onClick={() => setConfirmarBaja(true)}>Desactivar cuenta</Button>
          )
        ) : (
          <Button onClick={() => acciones.cambiarEstado(u.id_usuario, 'Activo')}>Reactivar cuenta</Button>
        )}
        <Button onClick={onClose}>Listo</Button>
      </DialogActions>
    </Dialog>
  );
}

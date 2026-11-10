import { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, TextField, Tooltip, Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as admin from '../../api/admin';
import { RolUsuario } from '../../config/roles';
import { roles } from '../../tokens';
import { fecha, nombreCompleto, nombreUnidad, telefono } from '../../utils/formato';
import { formatearRut } from '../../utils/rut';
import SelloCargo from '../marca/SelloCargo';
import PlacaUnidad from '../marca/PlacaUnidad';

// Como la API (CARGOS_ASIGNABLES y CARGOS_UNICOS de residentes): estos se pueden asignar; los cuatro
// primeros los tiene una sola persona a la vez (al asignarlo, la anterior lo deja)
const ASIGNABLES = [RolUsuario.PRESIDENTE, RolUsuario.TESORERO, RolUsuario.SECRETARIO, RolUsuario.CONSERJE, RolUsuario.ADMINISTRADOR];
const UNICOS = [RolUsuario.ADMINISTRADOR, RolUsuario.TESORERO, RolUsuario.SECRETARIO, RolUsuario.PRESIDENTE];
const DIRECTIVA = [RolUsuario.PRESIDENTE, RolUsuario.TESORERO, RolUsuario.SECRETARIO];

function Dato({ etiqueta, children }) {
  return (
    <Box>
      <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }}>{children || '—'}</Typography>
    </Box>
  );
}

// Ficha de una persona: datos, viviendas, cargos y estado de la cuenta. Cada acción devuelve la persona
// actualizada (`onCambio`); al desactivar, la titularidad de su vivienda pasa al siguiente residente.
export default function DialogoUsuario({ persona: u, personas, unidadPorId, titularDe, onClose, onCambio }) {
  const { usuario: yo } = useSesion();
  const { avisar } = useAviso();
  const [nuevoCargo, setNuevoCargo] = useState('');
  const [hasta, setHasta] = useState('');
  const [confirmarBaja, setConfirmarBaja] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);

  const activo = u.estado !== 'Desactivado';
  const disponibles = ASIGNABLES.filter((idRol) => !u.cargos.some((c) => c.idRol === idRol));
  const reemplaza = nuevoCargo && UNICOS.includes(nuevoCargo)
    ? personas.find((x) => x.idUsuario !== u.idUsuario && x.estado !== 'Desactivado' && x.cargos.some((c) => c.idRol === nuevoCargo))
    : null;
  const esTitular = u.viviendas.some((v) => titularDe(v.idUnidad) === u.idUsuario);
  const rut = u.pais === 'CL' ? formatearRut(u.identificador) : u.identificador;

  const accion = async (clave, hacer, mensaje) => {
    setEnviando(clave);
    setError(null);
    try {
      const r = await hacer();
      if (r?.idUsuario) onCambio(r);
      avisar(typeof mensaje === 'function' ? mensaje(r) : mensaje);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setEnviando(null);
    }
  };
  const asignar = async () => {
    const ok = await accion('asignar', () => admin.asignarCargo(u.idUsuario, nuevoCargo, hasta), `${u.nombre} es ahora ${roles[nuevoCargo].label}.`);
    if (ok) { setNuevoCargo(''); setHasta(''); }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 7 }}>
        {nombreCompleto(u)}
        <Typography color="text.secondary">{rut}</Typography>
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 12, top: 12 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5 }}>
        {u.estado === 'Invitado' && (
          <Alert
            severity="warning" variant="outlined"
            action={<Button color="inherit" size="small" loading={enviando === 'reenviar'} onClick={() => accion('reenviar', () => admin.reenviarInvitacion(u.idUsuario),
              (r) => (r.correoEnviado ? `Reenviamos la invitación a ${u.correo}.` : 'No se pudo enviar el correo. Intenta de nuevo más tarde.'))}>Reenviar</Button>}
          >
            Todavía no crea su clave.
          </Alert>
        )}
        {!activo && <Alert severity="error" variant="outlined">Cuenta desactivada. No puede entrar a la comunidad.</Alert>}

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          <Dato etiqueta="Correo">{u.correo}</Dato>
          <Dato etiqueta="Teléfono">{telefono(u.telefono)}</Dato>
          <Dato etiqueta="En la comunidad desde">{fecha(u.enComunidadDesde)} {String(u.enComunidadDesde).slice(0, 4)}</Dato>
        </Box>

        {u.viviendas.length > 0 && (
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="subtitle2" component="h3">Vivienda</Typography>
            {u.viviendas.map((v) => (
              <Box key={v.idResidencia} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <PlacaUnidad unidad={unidadPorId[v.idUnidad] ?? { numeroIdentificador: v.numeroIdentificador }} size="sm" />
                <Typography>{nombreUnidad(unidadPorId[v.idUnidad] ?? v)}{v.callePasaje ? ` · ${v.callePasaje}` : ''} · {v.tipoResidencia}{titularDe(v.idUnidad) === u.idUsuario ? ' · titular' : ''}</Typography>
              </Box>
            ))}
          </Box>
        )}

        <Box sx={{ display: 'grid', gap: 1.25 }}>
          <Typography variant="subtitle2" component="h3">Cargos en esta comunidad</Typography>
          {u.cargos.length === 0 && <Typography color="text.secondary">Sin cargos. Usa la app como residente.</Typography>}
          {u.cargos.map((c) => (
            <Box key={c.idRol} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'space-between', border: 1, borderColor: 'divider', borderRadius: 1, px: 1.5, py: 1 }}>
              <Box>
                <SelloCargo cargo={c.idRol} conTexto />
                <Typography variant="body2" color="text.secondary">Desde {fecha(c.desde)} {c.desde.slice(0, 4)}{c.hasta ? ` hasta ${fecha(c.hasta)} ${c.hasta.slice(0, 4)}` : ''}</Typography>
              </Box>
              <Tooltip title={`Quitar cargo de ${roles[c.idRol].label}`}>
                <IconButton
                  aria-label={`Quitar cargo de ${roles[c.idRol].label}`} disabled={enviando === `quitar-${c.idRol}`}
                  onClick={() => accion(`quitar-${c.idRol}`, () => admin.quitarCargo(u.idUsuario, c.idRol), `${u.nombre} dejó de ser ${roles[c.idRol].label}.`)}
                ><CloseIcon /></IconButton>
              </Tooltip>
            </Box>
          ))}

          {activo && disponibles.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 170px auto' }, alignItems: 'start', mt: 0.5 }}>
              <TextField select size="small" label="Asignar cargo" value={nuevoCargo} onChange={(e) => setNuevoCargo(e.target.value)}>
                {disponibles.map((idRol) => <MenuItem key={idRol} value={idRol}>{roles[idRol].label}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Hasta (opcional)" value={hasta} onChange={(e) => setHasta(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: new Date().toISOString().slice(0, 10) } }} />
              <Button variant="contained" disabled={!nuevoCargo} loading={enviando === 'asignar'} onClick={asignar}>Asignar</Button>
              {reemplaza && (
                <Typography variant="body2" color="warning.main" sx={{ gridColumn: '1 / -1' }}>
                  {nombreCompleto(reemplaza)} es {roles[nuevoCargo].label} ahora. Al asignar, deja el cargo.
                </Typography>
              )}
            </Box>
          )}
          {u.cargos.some((c) => DIRECTIVA.includes(c.idRol)) && (
            <Typography variant="body2" color="text.secondary">Los cambios de cargo quedan en la bitácora de la comunidad.</Typography>
          )}
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
        {activo ? (
          u.idUsuario === yo.idUsuario ? <Typography variant="body2" color="text.secondary">No puedes desactivar tu propia cuenta.</Typography> : confirmarBaja ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2">
                Pierde el acceso y sus cargos{esTitular ? '; la titularidad de su vivienda pasa al siguiente residente' : ''}.
              </Typography>
              <Button color="error" variant="contained" loading={enviando === 'baja'}
                onClick={async () => { if (await accion('baja', () => admin.desactivarPersona(u.idUsuario), `Desactivamos la cuenta de ${u.nombre}.`)) setConfirmarBaja(false); }}>
                Desactivar
              </Button>
              <Button onClick={() => setConfirmarBaja(false)}>No</Button>
            </Box>
          ) : (
            <Button color="error" onClick={() => setConfirmarBaja(true)}>Desactivar cuenta</Button>
          )
        ) : (
          <Button loading={enviando === 'alta'} onClick={() => accion('alta', () => admin.reactivarPersona(u.idUsuario), `${u.nombre} puede entrar otra vez.`)}>Reactivar cuenta</Button>
        )}
        <Button onClick={onClose}>Listo</Button>
      </DialogActions>
    </Dialog>
  );
}

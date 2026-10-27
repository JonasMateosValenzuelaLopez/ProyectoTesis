import { useEffect, useRef, useState } from 'react';
import { Navigate, Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Link as MuiLink, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import { usePlataforma } from '../../context/PlataformaContext';
import { MODULOS } from '../../config/modulos';
import { fecha, fechaHora } from '../../utils/formato';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import PlanoComunidad from '../../components/marca/PlanoComunidad';
import SelloCargo from '../../components/marca/SelloCargo';
import EstadoComunidad from '../../components/plataforma/EstadoComunidad';

const TIPOS = ['Edificio', 'Condominio', 'Villa'];

function DialogoSuspender({ red, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={(e) => { e.preventDefault(); if (motivo.trim()) onConfirmar(motivo.trim()); }}>
      <DialogTitle>Suspender {red.nombre}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Typography color="text.secondary">Nadie de la comunidad podrá entrar al panel ni a la app hasta que la reactives. Los datos se conservan.</Typography>
        <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} multiline minRows={2} autoFocus placeholder="Ej.: la comunidad pidió pausar el servicio" helperText="Queda en la bitácora de plataforma" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" color="error" variant="contained" disabled={!motivo.trim()}>Suspender comunidad</Button>
      </DialogActions>
    </Dialog>
  );
}

function DialogoTipo({ red, onClose, onConfirmar }) {
  const [tipo, setTipo] = useState(red.tipo);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cambiar el tipo de comunidad</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <Alert severity="warning" variant="outlined">
          Las {red.unidades.length} unidades no se convierten: el plano se dibuja de otra forma y puede verse desordenado hasta que la administración las ordene. Los módulos se mantienen.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" disabled={tipo === red.tipo} onClick={() => onConfirmar(tipo)}>Cambiar a {tipo.toLowerCase()}</Button>
      </DialogActions>
    </Dialog>
  );
}

function Dato({ etiqueta, children }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 1.5, py: 0.75, borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}>
      <Typography variant="body2" color="text.secondary">{etiqueta}</Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

// Ficha de una comunidad en modo soporte: el equipo ve cómo está, cambia lo que es de
// plataforma (módulos, tipo, estado) y no toca datos propios de la comunidad.
export default function FichaComunidad() {
  const { id } = useParams();
  const { redPorId, usuariosDe, responsableDe, personas, acciones } = usePlataforma();
  const red = redPorId[Number(id)];
  const [dialogo, setDialogo] = useState(null);
  const anotada = useRef(null);

  useEffect(() => {
    if (red && anotada.current !== red.id) {
      anotada.current = red.id;
      acciones.abrirFicha(red);
    }
  }, [red, acciones]);

  if (!red) return <Navigate to="/plataforma" replace />;

  const usuarios = usuariosDe(red).filter((u) => u.estado !== 'desactivado');
  const conCargo = usuarios.filter((u) => u.cargos.length > 0);
  const responsable = responsableDe(red);
  const personaResp = responsable && personas.find((p) => p.rut === responsable.rut);
  const suspendida = red.estado === 'suspendida';

  return (
    <Box sx={{ maxWidth: 1300 }}>
      <Encabezado
        contexto={<><MuiLink component={RouterLink} to="/plataforma" color="inherit">Comunidades</MuiLink> · {red.tipo}</>}
        titulo={red.nombre}
        descripcion={red.direccion}
        acciones={suspendida
          ? <Button variant="contained" onClick={() => acciones.reactivar(red)}>Reactivar comunidad</Button>
          : <Button color="error" variant="outlined" onClick={() => setDialogo('suspender')}>Suspender</Button>}
      />
      {suspendida && <Alert severity="error" sx={{ mb: 2 }}>Suspendida. Motivo: {red.motivoSuspension}</Alert>}
      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        Modo soporte: ves la comunidad tal como está, pero los cobros, actas y datos de vecinos solo los cambia su directiva. Abrir esta ficha queda en la bitácora.
      </Alert>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5, minWidth: 0 }}>
          <Tarjeta titulo="Plano" extra={`${red.unidades.length.toLocaleString('es-CL')} unidades`}>
            <PlanoComunidad comunidad={red} />
          </Tarjeta>
          <Tarjeta titulo="Directiva y personal" extra={`${usuarios.length} ${usuarios.length === 1 ? 'persona registrada' : 'personas registradas'}`}>
            {conCargo.length === 0 && <Typography color="text.secondary">Todavía no hay cargos asignados.</Typography>}
            {conCargo.map((u) => (
              <Box key={u.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <SelloCargo cargo={u.cargos[0].cargo} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{u.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">{u.cargos.map((c) => roles[c.cargo].label).join(', ')} · {u.correo}</Typography>
                </Box>
                {u.estado === 'invitado' && <Chip size="small" variant="outlined" label="Invitación pendiente" />}
              </Box>
            ))}
          </Tarjeta>
        </Box>

        <Box sx={{ display: 'grid', gap: 2.5, minWidth: 0 }}>
          <Tarjeta titulo="Datos">
            <Box>
              <Dato etiqueta="Estado"><EstadoComunidad estado={red.estado} /></Dato>
              <Dato etiqueta="Tipo">
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography>{red.tipo}</Typography>
                  <MuiLink component="button" type="button" onClick={() => setDialogo('tipo')} sx={{ fontWeight: 700 }}>Cambiar</MuiLink>
                </Box>
              </Dato>
              <Dato etiqueta="En EntreCasas desde"><Typography>{fecha(red.creadaEn)}</Typography></Dato>
              <Dato etiqueta="Última actividad"><Typography>{fechaHora(red.ultimaActividad)}</Typography></Dato>
              <Dato etiqueta="Espacios comunes"><Typography>{red.espaciosComunes?.length ? red.espaciosComunes.join(', ') : 'Ninguno'}</Typography></Dato>
            </Box>
          </Tarjeta>

          <Tarjeta titulo="Responsable">
            {responsable ? (
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <SelloCargo cargo={responsable.cargo} size={32} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{responsable.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary">{roles[responsable.cargo].label} · {responsable.rut}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{responsable.correo}</Typography>
                  </Box>
                </Box>
                {personaResp && <Button variant="outlined" sx={{ justifySelf: 'start' }} onClick={() => acciones.reenviarAcceso(personaResp)}>Reenviar acceso</Button>}
              </Box>
            ) : <Typography color="error.main">La comunidad no tiene administrador ni presidente. Asigna uno desde Personas.</Typography>}
          </Tarjeta>

          <Tarjeta titulo="Módulos" extra={`${red.modulos.length} activos`}>
            <Box sx={{ mt: -0.5 }}>
              {Object.entries(MODULOS).map(([clave, nombre], i) => (
                <Box key={clave} component="label" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.5, borderTop: i ? 1 : 0, borderColor: 'divider', cursor: 'pointer' }}>
                  <Typography variant="body2">{nombre}</Typography>
                  <Switch size="small" checked={red.modulos.includes(clave)} onChange={(e) => acciones.cambiarModulo(red, clave, e.target.checked)} inputProps={{ 'aria-label': nombre }} />
                </Box>
              ))}
            </Box>
          </Tarjeta>
        </Box>
      </Box>

      {dialogo === 'suspender' && <DialogoSuspender red={red} onClose={() => setDialogo(null)} onConfirmar={(m) => { acciones.suspender(red, m); setDialogo(null); }} />}
      {dialogo === 'tipo' && <DialogoTipo red={red} onClose={() => setDialogo(null)} onConfirmar={(t) => { acciones.cambiarTipo(red, t); setDialogo(null); }} />}
    </Box>
  );
}

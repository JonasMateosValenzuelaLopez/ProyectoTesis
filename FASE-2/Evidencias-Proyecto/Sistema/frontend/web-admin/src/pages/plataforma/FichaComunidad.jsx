import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Link as MuiLink, MenuItem, Switch, TextField, Typography,
} from '@mui/material';
import * as plataforma from '../../api/plataforma';
import { useConsulta } from '../../api/useConsulta';
import { useAviso } from '../../context/AvisoContext';
import { MODULOS, tieneModulo } from '../../config/modulos';
import { ID_ROL_POR_NOMBRE } from '../../config/roles';
import { fecha, fechaHora } from '../../utils/formato';
import { formatearRut } from '../../utils/rut';
import { roles } from '../../tokens';
import Encabezado from '../../components/ui/Encabezado';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlanoComunidad from '../../components/marca/PlanoComunidad';
import SelloCargo from '../../components/marca/SelloCargo';
import EstadoComunidad from '../../components/plataforma/EstadoComunidad';

const TIPOS = ['Edificio', 'Condominio', 'Villa'];
const rutDe = (p) => (p.pais === 'CL' ? formatearRut(p.identificador) : p.identificador);

function DialogoSuspender({ red, onClose, onConfirmar }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const confirmar = async (e) => {
    e.preventDefault();
    if (!motivo.trim()) return;
    setEnviando(true);
    if (!(await onConfirmar(motivo.trim()))) setEnviando(false);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" component="form" onSubmit={confirmar}>
      <DialogTitle>Suspender {red.nombre}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <Typography color="text.secondary">Nadie de la comunidad podrá entrar al panel ni a la app hasta que la reactives. Los datos se conservan.</Typography>
        <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} multiline minRows={2} autoFocus placeholder="Ej.: la comunidad pidió pausar el servicio" helperText="Lo ven quienes intenten entrar, y queda en la bitácora de plataforma" />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button type="submit" color="error" variant="contained" loading={enviando} disabled={!motivo.trim()}>Suspender comunidad</Button>
      </DialogActions>
    </Dialog>
  );
}

function DialogoTipo({ red, onClose, onConfirmar }) {
  const [tipo, setTipo] = useState(red.tipo);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    if (!(await onConfirmar(tipo))) setEnviando(false);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Cambiar el tipo de comunidad</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        <TextField select label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <Alert severity="warning" variant="outlined">
          Las {red.totalUnidades} unidades no se convierten: el plano se dibuja de otra forma y puede verse desordenado hasta que la administración las ordene. Los módulos se mantienen.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" loading={enviando} disabled={tipo === red.tipo} onClick={confirmar}>Cambiar a {tipo.toLowerCase()}</Button>
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

// Ficha de una comunidad en modo soporte (GET plataforma/comunidades/:idRed): el equipo ve cómo está,
// cambia lo que es de plataforma (módulos, tipo, estado) y no toca datos propios de la comunidad.
export default function FichaComunidad() {
  const { id } = useParams();
  const { avisar, avisarError } = useAviso();
  const { datos: red, cargando, error, recargar, setDatos } = useConsulta(() => plataforma.fichaComunidad(id), [id]);
  const [dialogo, setDialogo] = useState(null);
  const [moduloEnCurso, setModuloEnCurso] = useState(null);

  const encabezadoBase = (
    <Encabezado contexto={<MuiLink component={RouterLink} to="/plataforma" color="inherit">Comunidades</MuiLink>} titulo={red?.nombre ?? 'Comunidad'} />
  );
  if (!red) return <Box sx={{ maxWidth: 1300 }}>{encabezadoBase}<EstadoCarga cargando={cargando} error={error} onReintentar={recargar} /></Box>;

  // Cada acción devuelve el resumen actualizado de la comunidad; la ficha conserva sus unidades y directiva
  const aplicar = async (accion, mensaje) => {
    try {
      const resumen = await accion();
      setDatos((d) => ({ ...d, ...resumen }));
      avisar(mensaje);
      return true;
    } catch (e) {
      avisarError(e.message);
      return false;
    }
  };
  const cambiarModulo = async (clave, activo) => {
    setModuloEnCurso(clave);
    await aplicar(() => plataforma.cambiarModulo(red.idRed, clave, activo), `${MODULOS[clave]}: ${activo ? 'activado' : 'desactivado'}.`);
    setModuloEnCurso(null);
  };
  const suspender = async (motivo) => {
    const ok = await aplicar(() => plataforma.suspenderComunidad(red.idRed, motivo), `${red.nombre} quedó suspendida.`);
    if (ok) setDialogo(null);
    return ok;
  };
  const cambiarTipo = async (tipo) => {
    const ok = await aplicar(() => plataforma.cambiarTipo(red.idRed, tipo), `${red.nombre} ahora es de tipo ${tipo.toLowerCase()}.`);
    if (ok) setDialogo(null);
    return ok;
  };

  const responsable = red.responsable;
  const suspendida = red.estado === 'Suspendida';

  return (
    <Box sx={{ maxWidth: 1300 }}>
      <Encabezado
        contexto={<><MuiLink component={RouterLink} to="/plataforma" color="inherit">Comunidades</MuiLink> · {red.tipo}</>}
        titulo={red.nombre}
        descripcion={red.direccion}
        acciones={suspendida
          ? <Button variant="contained" onClick={() => aplicar(() => plataforma.reactivarComunidad(red.idRed), `${red.nombre} está activa otra vez.`)}>Reactivar comunidad</Button>
          : <Button color="error" variant="outlined" onClick={() => setDialogo('suspender')}>Suspender</Button>}
      />
      {suspendida && <Alert severity="error" sx={{ mb: 2 }}>Suspendida. Motivo: {red.motivoSuspension}</Alert>}
      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        Modo soporte: ves la comunidad tal como está, pero los cobros, actas y datos de vecinos solo los cambia su directiva. Abrir esta ficha queda en la bitácora.
      </Alert>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5, minWidth: 0 }}>
          <Tarjeta titulo="Plano" extra={`${red.totalUnidades.toLocaleString('es-CL')} unidades`}>
            <PlanoComunidad comunidad={red} />
          </Tarjeta>
          <Tarjeta titulo="Directiva y personal" extra={`${red.totalPersonas} ${red.totalPersonas === 1 ? 'persona registrada' : 'personas registradas'}`}>
            {red.directiva.length === 0 && <Typography color="text.secondary">Todavía no hay cargos asignados.</Typography>}
            {red.directiva.map((p) => (
              <Box key={p.idUsuario} sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <SelloCargo cargo={ID_ROL_POR_NOMBRE[p.cargos[0]]} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>{p.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {p.cargos.map((c) => roles[ID_ROL_POR_NOMBRE[c]]?.label ?? c).join(', ')} · {p.correo}
                  </Typography>
                </Box>
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
              <Dato etiqueta="En EntreCasas desde"><Typography>{fecha(red.fechaCreacion)}</Typography></Dato>
              <Dato etiqueta="Última actividad"><Typography>{red.ultimaActividad ? fechaHora(red.ultimaActividad) : 'Sin actividad todavía'}</Typography></Dato>
            </Box>
          </Tarjeta>

          <Tarjeta titulo="Responsable">
            {responsable ? (
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <SelloCargo cargo={ID_ROL_POR_NOMBRE[responsable.cargo]} size={32} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{responsable.nombre}</Typography>
                  <Typography variant="body2" color="text.secondary">{roles[ID_ROL_POR_NOMBRE[responsable.cargo]]?.label ?? responsable.cargo} · {rutDe(responsable)}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{responsable.correo}</Typography>
                </Box>
              </Box>
            ) : <Typography color="error.main">La comunidad no tiene administrador ni presidente.</Typography>}
          </Tarjeta>

          <Tarjeta titulo="Módulos" extra={`${red.modulos.length} activos`}>
            <Box sx={{ mt: -0.5 }}>
              {Object.entries(MODULOS).map(([clave, nombre], i) => (
                <Box key={clave} component="label" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.5, borderTop: i ? 1 : 0, borderColor: 'divider', cursor: 'pointer' }}>
                  <Typography variant="body2">{nombre}</Typography>
                  <Switch
                    size="small" checked={tieneModulo(red, clave)} disabled={moduloEnCurso === clave}
                    onChange={(e) => cambiarModulo(clave, e.target.checked)} slotProps={{ input: { 'aria-label': nombre } }}
                  />
                </Box>
              ))}
            </Box>
          </Tarjeta>
        </Box>
      </Box>

      {dialogo === 'suspender' && <DialogoSuspender red={red} onClose={() => setDialogo(null)} onConfirmar={suspender} />}
      {dialogo === 'tipo' && <DialogoTipo red={red} onClose={() => setDialogo(null)} onConfirmar={cambiarTipo} />}
    </Box>
  );
}

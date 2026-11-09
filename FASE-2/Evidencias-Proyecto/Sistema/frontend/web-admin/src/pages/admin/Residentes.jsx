import { useState } from 'react';
import {
  Alert, Box, Button, ButtonBase, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { ChevronRight as IrIcon, PersonAddAlt1Outlined as InvitarIcon } from '@mui/icons-material';
import { roles } from '../../tokens';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { fecha, nombreCompleto, nombreUnidad } from '../../utils/formato';
import { formatearRut } from '../../utils/rut';
import Encabezado from '../../components/ui/Encabezado';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import SelloCargo from '../../components/marca/SelloCargo';
import DialogoUsuario from '../../components/admin/DialogoUsuario';
import DialogoInvitar from '../../components/admin/DialogoInvitar';

const rutDe = (p) => (p.pais === 'CL' ? formatearRut(p.identificador) : p.identificador);
const FILTROS = {
  todos: { texto: 'Todas las personas', fn: () => true },
  cargos: { texto: 'Directiva y personal', fn: (u) => u.cargos.length > 0 },
  propietario: { texto: 'Propietarios', fn: (u) => u.viviendas.some((v) => v.tipoResidencia === 'Propietario') },
  arrendatario: { texto: 'Arrendatarios', fn: (u) => u.viviendas.some((v) => v.tipoResidencia === 'Arrendatario') },
  invitado: { texto: 'Invitación pendiente', fn: (u) => u.estado === 'Invitado' },
};

// Aprobar o rechazar una solicitud. Si la API no la pudo unir a una unidad (el número no calzó), hay que elegirla.
function DialogoResolver({ solicitud: s, aprobar, unidades, onClose, onResuelta }) {
  const { avisar } = useAviso();
  const [idUnidad, setIdUnidad] = useState(s.idUnidad ?? '');
  const [tipoResidencia, setTipoResidencia] = useState(s.tipoResidencia);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = aprobar
        ? await admin.aprobarSolicitud(s.idSolicitud, { ...(idUnidad ? { idUnidad } : {}), tipoResidencia })
        : await admin.rechazarSolicitud(s.idSolicitud, motivo.trim());
      avisar(aprobar
        ? `${s.nombre} ya puede entrar a la app${r.correoEnviado ? ': le avisamos por correo' : ''}.`
        : `Rechazamos la solicitud de ${s.nombre}${r.correoEnviado ? ' y le avisamos por correo' : ''}.`);
      onResuelta();
      onClose();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{aprobar ? `Aprobar a ${s.nombre} ${s.primerApellido}` : `Rechazar a ${s.nombre} ${s.primerApellido}`}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, pt: '8px !important' }}>
        {aprobar ? (
          <>
            {!s.idUnidad && <Alert severity="warning" variant="outlined">Escribió «{s.numeroUnidad}» y no calza con una sola unidad. Elige cuál es.</Alert>}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
              <TextField select label="Unidad" value={idUnidad} onChange={(e) => setIdUnidad(e.target.value)}>
                {unidades.map((u) => <MenuItem key={u.idUnidad} value={u.idUnidad}>{nombreUnidad(u)}{u.callePasaje ? ` · ${u.callePasaje}` : ''}</MenuItem>)}
              </TextField>
              <TextField select label="Relación con la unidad" value={tipoResidencia} onChange={(e) => setTipoResidencia(e.target.value)}>
                <MenuItem value="Propietario">Propietario</MenuItem>
                <MenuItem value="Arrendatario">Arrendatario</MenuItem>
              </TextField>
            </Box>
            <Typography color="text.secondary">Si es nueva en EntreCasas, le llega un correo para crear su clave.</Typography>
          </>
        ) : (
          <TextField label="Motivo (opcional)" value={motivo} onChange={(e) => setMotivo(e.target.value)} multiline minRows={2}
            helperText="Se lo enviamos por correo" slotProps={{ htmlInput: { maxLength: 255 } }} />
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" color={aprobar ? 'primary' : 'error'} loading={enviando} disabled={aprobar && !idUnidad} onClick={confirmar}>
          {aprobar ? 'Aprobar acceso' : 'Rechazar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Solicitudes({ solicitudes, unidades, unidadPorId, onResuelta }) {
  const [resolver, setResolver] = useState(null);
  if (solicitudes.length === 0) {
    return <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">No hay solicitudes de acceso pendientes.</Typography></Paper>;
  }
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
      {solicitudes.map((s) => {
        const unidad = s.idUnidad ? unidadPorId[s.idUnidad] : null;
        const actuales = unidad?.ocupantes ?? [];
        return (
          <Paper key={s.idSolicitud} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {unidad ? <PlacaUnidad unidad={unidad} size="sm" /> : <Chip size="small" color="warning" variant="outlined" label={`«${s.numeroUnidad}»`} />}
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(s)}</Typography>
                <Typography variant="body2" color="text.secondary">{rutDe(s)} · {s.tipoResidencia} · pidió el {fecha(s.fechaSolicitud)} · {s.correo}</Typography>
              </Box>
            </Box>
            {s.mensaje && <Typography color="text.secondary">«{s.mensaje}»</Typography>}
            <Typography variant="body2">
              {!unidad ? `El número «${s.numeroUnidad}» no calza con una sola unidad: elígela al aprobar.`
                : actuales.length ? `Hoy en ${nombreUnidad(unidad)}: ${actuales.map((o) => `${o.nombre} (${o.tipoResidencia.toLowerCase()})`).join(', ')}.`
                  : `${nombreUnidad(unidad)} no tiene residentes registrados.`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={() => setResolver({ s, aprobar: true })}>Aprobar acceso</Button>
              <Button color="inherit" onClick={() => setResolver({ s, aprobar: false })}>Rechazar</Button>
            </Box>
          </Paper>
        );
      })}
      {resolver && <DialogoResolver solicitud={resolver.s} aprobar={resolver.aprobar} unidades={unidades} onClose={() => setResolver(null)} onResuelta={onResuelta} />}
    </Box>
  );
}

// Personas de la comunidad (GET residentes): su vivienda, sus cargos y el estado de su cuenta,
// y las solicitudes de acceso pendientes (GET solicitudes-acceso).
export default function Residentes() {
  const { comunidad } = useSesion();
  const personas = useConsulta(admin.listarResidentes);
  const unidadesC = useConsulta(admin.listarUnidades);
  const solicitudesC = useConsulta(() => admin.listarSolicitudes('Pendiente'));
  const [pestana, setPestana] = useState('personas');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [invitar, setInvitar] = useState(false);

  const encabezado = (
    <Encabezado
      contexto={comunidad.nombre}
      titulo="Residentes y cargos"
      descripcion="Las personas de la comunidad, su vivienda y sus cargos. Un cargo vale solo en esta comunidad."
      acciones={<Button variant="contained" startIcon={<InvitarIcon />} disabled={!unidadesC.datos} onClick={() => setInvitar(true)}>Invitar residente</Button>}
    />
  );
  const usuarios = personas.datos;
  const unidades = unidadesC.datos;
  if (!usuarios || !unidades) {
    const pendiente = !usuarios ? personas : unidadesC;
    return <Box sx={{ maxWidth: 1300 }}>{encabezado}<EstadoCarga cargando={pendiente.cargando} error={pendiente.error} onReintentar={pendiente.recargar} /></Box>;
  }

  const unidadPorId = Object.fromEntries(unidades.map((u) => [u.idUnidad, u]));
  const titularDe = (idUnidad) => unidadPorId[idUnidad]?.ocupantes.find((o) => o.titular)?.idUsuario ?? null;
  const solicitudes = solicitudesC.datos ?? [];
  // Reemplaza a una persona con la respuesta de la API; los cambios de cuenta pueden mover titulares
  const actualizar = (p) => {
    personas.setDatos((lista) => (lista.some((x) => x.idUsuario === p.idUsuario) ? lista.map((x) => (x.idUsuario === p.idUsuario ? p : x)) : [...lista, p]));
    unidadesC.recargar();
  };

  const texto = busqueda.trim().toLowerCase();
  const base = usuarios.filter((u) => (pestana === 'desactivados' ? u.estado === 'Desactivado' : u.estado !== 'Desactivado'));
  const lista = base
    .filter((u) => FILTROS[filtro].fn(u))
    .filter((u) => !texto || [nombreCompleto(u), rutDe(u), u.identificador, u.correo, ...u.viviendas.map((v) => nombreUnidad(unidadPorId[v.idUnidad] ?? v))].join(' ').toLowerCase().includes(texto));
  const desactivados = usuarios.filter((u) => u.estado === 'Desactivado').length;
  const placa = (v) => <PlacaUnidad key={v.idResidencia} unidad={unidadPorId[v.idUnidad] ?? { numeroIdentificador: v.numeroIdentificador }} size="sm" />;
  const persona = usuarios.find((u) => u.idUsuario === seleccion);

  return (
    <Box sx={{ maxWidth: 1300 }}>
      {encabezado}

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="personas" label={`Personas (${usuarios.length - desactivados})`} />
        <Tab value="solicitudes" label={`Solicitudes de acceso (${solicitudes.length})`} />
        <Tab value="desactivados" label="Desactivados" />
      </Tabs>

      {pestana === 'solicitudes' ? (
        solicitudesC.datos
          ? <Solicitudes solicitudes={solicitudes} unidades={unidades} unidadPorId={unidadPorId} onResuelta={() => { solicitudesC.recargar(); personas.recargar(); unidadesC.recargar(); }} />
          : <EstadoCarga cargando={solicitudesC.cargando} error={solicitudesC.error} onReintentar={solicitudesC.recargar} />
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" label="Buscar por nombre, RUT o unidad" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ flex: '1 1 260px', maxWidth: 420 }} />
            {pestana === 'personas' && (
              <TextField select size="small" label="Mostrar" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ minWidth: 220 }}>
                {Object.entries(FILTROS).map(([k, f]) => <MenuItem key={k} value={k}>{f.texto}</MenuItem>)}
              </TextField>
            )}
          </Box>

          {/* En el celular cada persona es una fila tocable; la tabla queda para pantallas anchas */}
          <Paper variant="outlined" sx={{ display: { xs: 'block', md: 'none' }, borderRadius: 1.5, overflow: 'hidden' }}>
            {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Nadie coincide con la búsqueda.</Typography>}
            {lista.map((u, i) => (
              <ButtonBase key={u.idUsuario} onClick={() => setSeleccion(u.idUsuario)} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', width: '100%', textAlign: 'left', px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', '&:active': { bgcolor: 'action.hover' } }}>
                <Box sx={{ width: 52, display: 'grid', gap: 0.5, justifyItems: 'start' }}>
                  {u.viviendas.length === 0 ? <Typography variant="caption" color="text.secondary">Personal</Typography> : u.viviendas.map(placa)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(u)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[...u.viviendas.map((v) => v.tipoResidencia), ...u.cargos.map((c) => roles[c.idRol]?.label ?? c.cargo)].join(' · ') || rutDe(u)}
                  </Typography>
                  {u.estado === 'Invitado' && <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 700 }}>Invitación pendiente</Typography>}
                </Box>
                <IrIcon sx={{ color: 'text.secondary' }} />
              </ButtonBase>
            ))}
          </Paper>

          <TableContainer component={Paper} variant="outlined" sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 1.5 }}>
            <Table sx={{ minWidth: 820 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Persona</TableCell>
                  <TableCell>Vivienda</TableCell>
                  <TableCell>Cargos</TableCell>
                  <TableCell>Cuenta</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.length === 0 && (
                  <TableRow><TableCell colSpan={4}><Typography color="text.secondary">Nadie coincide con la búsqueda.</Typography></TableCell></TableRow>
                )}
                {lista.map((u) => (
                  <TableRow key={u.idUsuario} hover tabIndex={0} onClick={() => setSeleccion(u.idUsuario)} onKeyDown={(e) => e.key === 'Enter' && setSeleccion(u.idUsuario)} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">{rutDe(u)}</Typography>
                    </TableCell>
                    <TableCell>
                      {u.viviendas.length === 0 ? <Typography color="text.secondary">Personal</Typography> : u.viviendas.map((v) => (
                        <Box key={v.idResidencia} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                          {placa(v)}
                          <Typography variant="body2" color="text.secondary">{v.tipoResidencia}{titularDe(v.idUnidad) === u.idUsuario ? ' · titular' : ''}</Typography>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {u.cargos.length === 0 && <Typography variant="body2" color="text.secondary">Sin cargo</Typography>}
                        {u.cargos.map((c) => <SelloCargo key={c.idRol} cargo={c.idRol} conTexto sx={{ fontSize: '0.875rem' }} />)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {u.estado === 'Activo' && <Typography variant="body2" color="text.secondary">Activa</Typography>}
                      {u.estado === 'Invitado' && <Chip size="small" variant="outlined" color="warning" label="Invitación pendiente" />}
                      {u.estado === 'Desactivado' && <Chip size="small" variant="outlined" label="Desactivada" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Toca una persona para ver sus datos y asignar o quitar cargos.</Typography>
        </>
      )}

      {persona && (
        <DialogoUsuario persona={persona} personas={usuarios} unidadPorId={unidadPorId} titularDe={titularDe} onClose={() => setSeleccion(null)} onCambio={actualizar} />
      )}
      <DialogoInvitar open={invitar} unidades={unidades} onClose={() => setInvitar(false)} onInvitada={actualizar} />
    </Box>
  );
}

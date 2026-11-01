import { useState } from 'react';
import {
  Box, Button, ButtonBase, Chip, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { ChevronRight as IrIcon, PersonAddAlt1Outlined as InvitarIcon } from '@mui/icons-material';
import { roles } from '../../tokens';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { fecha, nombreCompleto, nombreUnidad } from '../../utils/formato';
import { residenciasActivas } from '../../config/roles';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import SelloCargo from '../../components/marca/SelloCargo';
import DialogoUsuario from '../../components/admin/DialogoUsuario';
import DialogoInvitar from '../../components/admin/DialogoInvitar';

// Una cuenta desactivada conserva sus residencias como historial (estado Inactiva)
const viviendas = (u) => (u.estado === 'Desactivado' ? u.residencias.filter((r) => r.estado !== 'Pendiente') : residenciasActivas(u));
const FILTROS = {
  todos: { texto: 'Todas las personas', fn: () => true },
  cargos: { texto: 'Directiva y personal', fn: (u, cargos) => cargos.length > 0 },
  propietario: { texto: 'Propietarios', fn: (u) => viviendas(u).some((r) => r.relacion === 'Propietario') },
  arrendatario: { texto: 'Arrendatarios', fn: (u) => viviendas(u).some((r) => r.relacion === 'Arrendatario') },
  invitado: { texto: 'Invitación pendiente', fn: (u) => u.estado === 'Invitado' },
};

function Solicitudes() {
  const { solicitudesPendientes, unidadPorId, ocupantes, acciones } = useAdmin();
  if (solicitudesPendientes.length === 0) {
    return <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}><Typography color="text.secondary">No hay solicitudes de acceso pendientes.</Typography></Paper>;
  }
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
      {solicitudesPendientes.map((s) => {
        const unidad = unidadPorId[s.id_unidad];
        const actuales = ocupantes[s.id_unidad] ?? [];
        return (
          <Paper key={s.id_residencia} variant="outlined" sx={{ p: 2.5, borderRadius: 1.5, display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <PlacaUnidad unidad={unidad} size="sm" />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(s.usuario)}</Typography>
                <Typography variant="body2" color="text.secondary">{s.usuario.rut} · {s.relacion} · pidió el {fecha(s.fecha_solicitud)}</Typography>
              </Box>
            </Box>
            {s.mensaje && <Typography color="text.secondary">«{s.mensaje}»</Typography>}
            <Typography variant="body2">
              {actuales.length
                ? `Hoy en ${nombreUnidad(unidad)}: ${actuales.map((o) => `${nombreCompleto(o)} (${o.relacion.toLowerCase()})`).join(', ')}.`
                : `${nombreUnidad(unidad)} no tiene residentes registrados.`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={() => acciones.resolverSolicitud(s.id_residencia, true)}>Aprobar acceso</Button>
              <Button color="inherit" onClick={() => acciones.resolverSolicitud(s.id_residencia, false)}>Rechazar</Button>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}

// Directorio completo de la comunidad: personas, su unidad, sus cargos y el estado de su cuenta.
export default function Residentes() {
  const { comunidad } = useSesion();
  const { usuarios, unidadPorId, solicitudesPendientes, cargosVigentes } = useAdmin();
  const [pestana, setPestana] = useState('personas');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [invitar, setInvitar] = useState(false);

  const texto = busqueda.trim().toLowerCase();
  const base = usuarios.filter((u) => (pestana === 'desactivados' ? u.estado === 'Desactivado' : u.estado !== 'Desactivado'));
  const lista = base
    .filter((u) => FILTROS[filtro].fn(u, cargosVigentes(u)))
    .filter((u) => !texto || [nombreCompleto(u), u.rut, u.correo, ...viviendas(u).map((r) => nombreUnidad(unidadPorId[r.id_unidad]))].join(' ').toLowerCase().includes(texto));
  const desactivados = usuarios.filter((u) => u.estado === 'Desactivado').length;

  return (
    <Box sx={{ maxWidth: 1300 }}>
      <Encabezado
        contexto={comunidad.nombre}
        titulo="Residentes y cargos"
        descripcion="Las personas de la comunidad, su vivienda y sus cargos. Un cargo vale solo en esta comunidad."
        acciones={<Button variant="contained" startIcon={<InvitarIcon />} onClick={() => setInvitar(true)}>Invitar residente</Button>}
      />

      <Tabs value={pestana} onChange={(_, v) => setPestana(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab value="personas" label={`Personas (${usuarios.length - desactivados})`} />
        <Tab value="solicitudes" label={`Solicitudes de acceso (${solicitudesPendientes.length})`} />
        <Tab value="desactivados" label="Desactivados" />
      </Tabs>

      {pestana === 'solicitudes' ? <Solicitudes /> : (
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
              <ButtonBase key={u.id_usuario} onClick={() => setSeleccion(u.id_usuario)} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', width: '100%', textAlign: 'left', px: 2, py: 1.5, borderTop: i ? 1 : 0, borderColor: 'divider', '&:active': { bgcolor: 'action.hover' } }}>
                <Box sx={{ width: 52, display: 'grid', gap: 0.5, justifyItems: 'start' }}>
                  {viviendas(u).length === 0
                    ? <Typography variant="caption" color="text.secondary">Personal</Typography>
                    : viviendas(u).map((r) => <PlacaUnidad key={r.id_unidad} unidad={unidadPorId[r.id_unidad]} size="sm" />)}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(u)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[...viviendas(u).map((r) => r.relacion), ...cargosVigentes(u).map((c) => roles[c.cargo].label)].join(' · ') || u.rut}
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
                  <TableRow key={u.id_usuario} hover tabIndex={0} onClick={() => setSeleccion(u.id_usuario)} onKeyDown={(e) => e.key === 'Enter' && setSeleccion(u.id_usuario)} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(u)}</Typography>
                      <Typography variant="body2" color="text.secondary">{u.rut}</Typography>
                    </TableCell>
                    <TableCell>
                      {viviendas(u).length === 0 ? <Typography color="text.secondary">Personal</Typography> : viviendas(u).map((r) => (
                        <Box key={r.id_unidad} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                          <PlacaUnidad unidad={unidadPorId[r.id_unidad]} size="sm" />
                          <Typography variant="body2" color="text.secondary">{r.relacion}</Typography>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {cargosVigentes(u).length === 0 && <Typography variant="body2" color="text.secondary">Sin cargo</Typography>}
                        {cargosVigentes(u).map((c) => <SelloCargo key={c.cargo} cargo={c.cargo} conTexto sx={{ fontSize: '0.875rem' }} />)}
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

      {seleccion && <DialogoUsuario id_usuario={seleccion} onClose={() => setSeleccion(null)} />}
      <DialogoInvitar open={invitar} onClose={() => setInvitar(false)} />
    </Box>
  );
}

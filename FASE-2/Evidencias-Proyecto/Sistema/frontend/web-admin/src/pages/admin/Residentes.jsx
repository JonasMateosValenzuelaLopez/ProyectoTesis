import { useState } from 'react';
import {
  Box, Button, Chip, MenuItem, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography,
} from '@mui/material';
import { PersonAddAlt1Outlined as InvitarIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { fecha, nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import SelloCargo from '../../components/marca/SelloCargo';
import DialogoUsuario from '../../components/admin/DialogoUsuario';
import DialogoInvitar from '../../components/admin/DialogoInvitar';

const FILTROS = {
  todos: { texto: 'Todas las personas', fn: () => true },
  cargos: { texto: 'Directiva y personal', fn: (u) => u.cargos.length > 0 },
  propietario: { texto: 'Propietarios', fn: (u) => u.residencias.some((r) => r.relacion === 'propietario') },
  arrendatario: { texto: 'Arrendatarios', fn: (u) => u.residencias.some((r) => r.relacion === 'arrendatario') },
  invitado: { texto: 'Invitación pendiente', fn: (u) => u.estado === 'invitado' },
};
const RELACION = { propietario: 'Propietario', arrendatario: 'Arrendatario' };

function Solicitudes() {
  const { solicitudesPendientes, unidadPorId, ocupantes, acciones } = useAdmin();
  if (solicitudesPendientes.length === 0) {
    return <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}><Typography color="text.secondary">No hay solicitudes de acceso pendientes.</Typography></Paper>;
  }
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, alignItems: 'start' }}>
      {solicitudesPendientes.map((s) => {
        const unidad = unidadPorId[s.idUnidad];
        const actuales = ocupantes[s.idUnidad] ?? [];
        return (
          <Paper key={s.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3, display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="sm" />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }}>{s.nombre}</Typography>
                <Typography variant="body2" color="text.secondary">{s.rut} · {RELACION[s.relacion]} · pidió el {fecha(s.fecha)}</Typography>
              </Box>
            </Box>
            {s.mensaje && <Typography color="text.secondary">«{s.mensaje}»</Typography>}
            <Typography variant="body2">
              {actuales.length
                ? `Hoy en ${nombreUnidad(unidad)}: ${actuales.map((o) => `${o.nombre} (${RELACION[o.relacion].toLowerCase()})`).join(', ')}.`
                : `${nombreUnidad(unidad)} no tiene residentes registrados.`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={() => acciones.resolverSolicitud(s.id, true)}>Aprobar acceso</Button>
              <Button color="inherit" onClick={() => acciones.resolverSolicitud(s.id, false)}>Rechazar</Button>
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
  const { usuarios, unidadPorId, solicitudesPendientes } = useAdmin();
  const [pestana, setPestana] = useState('personas');
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [invitar, setInvitar] = useState(false);

  const texto = busqueda.trim().toLowerCase();
  const base = usuarios.filter((u) => (pestana === 'desactivados' ? u.estado === 'desactivado' : u.estado !== 'desactivado'));
  const lista = base
    .filter(FILTROS[filtro].fn)
    .filter((u) => !texto || [u.nombre, u.rut, u.correo, ...u.residencias.map((r) => nombreUnidad(unidadPorId[r.idUnidad]))].join(' ').toLowerCase().includes(texto));
  const desactivados = usuarios.filter((u) => u.estado === 'desactivado').length;

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

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
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
                  <TableRow key={u.id} hover tabIndex={0} onClick={() => setSeleccion(u.id)} onKeyDown={(e) => e.key === 'Enter' && setSeleccion(u.id)} sx={{ cursor: 'pointer' }}>
                    <TableCell>
                      <Typography sx={{ fontWeight: 700 }}>{u.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">{u.rut}</Typography>
                    </TableCell>
                    <TableCell>
                      {u.residencias.length === 0 ? <Typography color="text.secondary">Personal</Typography> : u.residencias.map((r) => (
                        <Box key={r.idUnidad} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
                          <PlacaUnidad tipo={unidadPorId[r.idUnidad].tipo} numero={unidadPorId[r.idUnidad].numero} size="sm" />
                          <Typography variant="body2" color="text.secondary">{RELACION[r.relacion]}</Typography>
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                        {u.cargos.length === 0 && <Typography variant="body2" color="text.secondary">Residente</Typography>}
                        {u.cargos.map((c) => <SelloCargo key={c.cargo} cargo={c.cargo} conTexto sx={{ fontSize: '0.875rem' }} />)}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {u.estado === 'activo' && <Typography variant="body2" color="text.secondary">Activa</Typography>}
                      {u.estado === 'invitado' && <Chip size="small" variant="outlined" color="warning" label="Invitación pendiente" />}
                      {u.estado === 'desactivado' && <Chip size="small" variant="outlined" label="Desactivada" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>Toca una persona para ver sus datos y asignar o quitar cargos.</Typography>
        </>
      )}

      {seleccion && <DialogoUsuario idUsuario={seleccion} onClose={() => setSeleccion(null)} />}
      <DialogoInvitar open={invitar} onClose={() => setInvitar(false)} />
    </Box>
  );
}

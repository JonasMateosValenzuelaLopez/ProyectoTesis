import { useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { AddHomeWorkOutlined as LoteIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { rolesEfectivos, RolUsuario } from '../../config/roles';
import { nombreUnidad } from '../../utils/formato';
import { grupoDe, pisoDe } from '../../utils/unidades';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import EstadoCarga from '../../components/ui/EstadoCarga';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoLote from '../../components/admin/DialogoLote';

const ubicacion = (u) => {
  const grupo = grupoDe(u) || '—';
  return u.tipo === 'Departamento' ? `${grupo} · piso ${pisoDe(u)}` : grupo;
};

// Para el plano: con propietario y sin arrendatario = ocupada; con arrendatario = arrendada; sin nadie = vacía
function estadoOcupacion(ocupantes) {
  if (!ocupantes.length) return 'vacia';
  return ocupantes.some((o) => o.tipoResidencia === 'Arrendatario') ? 'arrendada' : 'ocupada';
}

// Datos de una unidad: sus residentes, el titular (PUT unidades/:id/titular) y corregir el número (PATCH unidades/:id)
function DialogoUnidad({ unidad, puedeEditar, onClose, onCambio }) {
  const { avisar } = useAviso();
  const [numero, setNumero] = useState(unidad.numeroIdentificador);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(null);
  const personas = unidad.ocupantes;
  const nuevo = numero.trim();
  const numeroMal = nuevo && !/^[A-Za-z0-9-]+$/.test(nuevo) ? 'El número solo puede tener letras, números y guiones' : null;

  const accion = async (clave, hacer, mensaje) => {
    setEnviando(clave);
    setError(null);
    try {
      await hacer();
      avisar(mensaje);
      onCambio();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setEnviando(null);
    }
  };
  const guardar = async () => {
    if (!nuevo || nuevo === unidad.numeroIdentificador) { onClose(); return; }
    if (numeroMal) return;
    if (await accion('numero', () => admin.editarUnidad(unidad.idUnidad, nuevo), `La unidad ahora es ${nombreUnidad({ ...unidad, numeroIdentificador: nuevo })}.`)) onClose();
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <PlacaUnidad unidad={unidad} size="sm" />
        {nombreUnidad(unidad)}
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography color="text.secondary">{ubicacion(unidad)}</Typography>
        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <Typography variant="subtitle2" component="h3">Residentes</Typography>
          {personas.length === 0 && <Typography color="text.secondary">Nadie registrado. Invita a sus residentes desde Residentes y cargos.</Typography>}
          {personas.map((p) => (
            <Box key={p.idUsuario} sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', minHeight: 32 }}>
              <Typography>{p.nombre} <Box component="span" sx={{ color: 'text.secondary' }}>· {p.tipoResidencia}</Box></Typography>
              {p.titular && <Chip size="small" color="info" variant="outlined" label="Titular" />}
              {!p.titular && puedeEditar && personas.length > 1 && (
                <Button size="small" sx={{ ml: 'auto' }} loading={enviando === p.idUsuario}
                  onClick={() => accion(p.idUsuario, () => admin.cambiarTitular(unidad.idUnidad, p.idUsuario), `${p.nombre} es ahora titular de ${nombreUnidad(unidad)}.`)}>
                  Dejar como titular
                </Button>
              )}
            </Box>
          ))}
          {personas.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {personas.some((p) => p.titular)
                ? 'El titular vota por la vivienda y recibe los avisos de votaciones. Si se desactiva, pasa al siguiente residente.'
                : 'Sin titular: nadie de la vivienda puede votar ni recibe los avisos de votaciones.'}
            </Typography>
          )}
        </Box>
        {puedeEditar && (
          <TextField
            size="small" label="Número" value={numero} onChange={(e) => { setNumero(e.target.value); setError(null); }}
            error={!!numeroMal} helperText={numeroMal ?? 'Cámbialo solo si se registró mal.'} slotProps={{ htmlInput: { maxLength: 20 } }}
          />
        )}
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{puedeEditar ? 'Cancelar' : 'Cerrar'}</Button>
        {puedeEditar && <Button variant="contained" loading={enviando === 'numero'} onClick={guardar}>Guardar</Button>}
      </DialogActions>
    </Dialog>
  );
}

// Unidades de la comunidad con sus residentes (GET unidades). Solo la administración crea, corrige y elige titular.
export default function Unidades() {
  const { comunidad, cargo } = useSesion();
  const puedeEditar = rolesEfectivos(cargo, comunidad).includes(RolUsuario.ADMINISTRADOR);
  const { datos: unidades, cargando, error, recargar } = useConsulta(admin.listarUnidades);
  const [lote, setLote] = useState(false);
  const [idUnidad, setIdUnidad] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const encabezado = (
    <Encabezado
      contexto={`${comunidad.nombre} · ${comunidad.tipo}`}
      titulo="Unidades"
      descripcion="Cada unidad recibe sus cobros y puede tener propietarios y arrendatarios."
      acciones={puedeEditar && <Button variant="contained" startIcon={<LoteIcon />} disabled={!unidades} onClick={() => setLote(true)}>Crear unidades en lote</Button>}
    />
  );
  if (!unidades) return <Box sx={{ maxWidth: 1300 }}>{encabezado}<EstadoCarga cargando={cargando} error={error} onReintentar={recargar} /></Box>;

  const estados = Object.fromEntries(unidades.map((u) => [u.idUnidad, estadoOcupacion(u.ocupantes)]));
  const cuenta = (e) => unidades.filter((u) => estados[u.idUnidad] === e).length;
  const texto = busqueda.trim().toLowerCase();
  const lista = unidades
    .filter((u) => filtro === 'todas' || estados[u.idUnidad] === filtro)
    .filter((u) => !texto || `${nombreUnidad(u)} ${ubicacion(u)} ${u.ocupantes.map((o) => o.nombre).join(' ')}`.toLowerCase().includes(texto));
  const unidad = unidades.find((u) => u.idUnidad === idUnidad);

  return (
    <Box sx={{ maxWidth: 1300 }}>
      {encabezado}
      <FranjaKpi items={[
        { etiqueta: 'Unidades', valor: unidades.length },
        { etiqueta: 'Vive el propietario', valor: cuenta('ocupada') },
        { etiqueta: 'Arrendadas', valor: cuenta('arrendada') },
        { etiqueta: 'Sin residentes', valor: cuenta('vacia'), color: cuenta('vacia') ? 'warning.main' : undefined, nota: cuenta('vacia') ? 'sin nadie registrado en la app' : undefined },
      ]} />

      <Tarjeta titulo="Plano de ocupación" extra="Toca una unidad para ver quién vive ahí" sx={{ mb: 2.5 }}>
        <PlanoComunidad comunidad={{ tipo: comunidad.tipo, unidades }} estados={estados} onSelect={(u) => setIdUnidad(u.idUnidad)} />
        <LeyendaPlano estados={['ocupada', 'arrendada', 'vacia']} />
      </Tarjeta>

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2, alignItems: 'center' }}>
        <TextField size="small" label="Buscar unidad o residente" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ flex: '1 1 240px', maxWidth: 380 }} />
        <ToggleButtonGroup size="small" exclusive value={filtro} onChange={(_, v) => v && setFiltro(v)}>
          <ToggleButton value="todas">Todas</ToggleButton>
          <ToggleButton value="arrendada">Arrendadas</ToggleButton>
          <ToggleButton value="vacia">Sin residentes</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5 }}>
        <Table size="small" sx={{ minWidth: { xs: 0, sm: 640 } }}>
          <TableHead>
            <TableRow>
              <TableCell>Unidad</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Ubicación</TableCell>
              <TableCell>Residentes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={3}><Typography color="text.secondary" sx={{ py: 1 }}>{unidades.length ? 'Ninguna unidad coincide.' : 'Todavía no hay unidades.'}</Typography></TableCell></TableRow>
            )}
            {lista.map((u) => (
              <TableRow key={u.idUnidad} hover tabIndex={0} onClick={() => setIdUnidad(u.idUnidad)} onKeyDown={(e) => e.key === 'Enter' && setIdUnidad(u.idUnidad)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ py: 1 }}><PlacaUnidad unidad={u} size="sm" /></TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{ubicacion(u)}</TableCell>
                <TableCell>
                  {u.ocupantes.length === 0
                    ? <Typography variant="body2" color="text.secondary">Sin residentes</Typography>
                    : u.ocupantes.map((o) => <Typography key={o.idUsuario} variant="body2">{o.nombre} <Box component="span" sx={{ color: 'text.secondary' }}>· {o.tipoResidencia}{o.titular ? ' · titular' : ''}</Box></Typography>)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {lote && <DialogoLote unidades={unidades} onClose={() => setLote(false)} onCreadas={recargar} />}
      {unidad && <DialogoUnidad key={unidad.idUnidad} unidad={unidad} puedeEditar={puedeEditar} onClose={() => setIdUnidad(null)} onCambio={recargar} />}
    </Box>
  );
}

import { useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { AddHomeWorkOutlined as LoteIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAdmin } from '../../context/AdminContext';
import { nombreUnidad } from '../../utils/formato';
import Encabezado from '../../components/ui/Encabezado';
import FranjaKpi from '../../components/ui/FranjaKpi';
import Tarjeta from '../../components/ui/Tarjeta';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import PlanoComunidad, { LeyendaPlano } from '../../components/marca/PlanoComunidad';
import DialogoLote from '../../components/admin/DialogoLote';

const RELACION = { propietario: 'Propietario', arrendatario: 'Arrendatario' };
const ubicacion = (u) => (u.piso ? `Torre ${u.torre} · piso ${u.piso}` : u.manzana ? `Manzana ${u.manzana}` : u.sector ? `Sector ${u.sector}` : '—');

function estadoOcupacion(ocupantes) {
  if (!ocupantes?.length) return 'vacia';
  return ocupantes.some((o) => o.relacion === 'propietario') && !ocupantes.some((o) => o.relacion === 'arrendatario') ? 'ocupada' : 'arrendada';
}

function DialogoUnidad({ unidad, onClose }) {
  const { ocupantes, acciones } = useAdmin();
  const [numero, setNumero] = useState(unidad.numero);
  const personas = ocupantes[unidad.id] ?? [];
  const guardar = () => {
    if (numero.trim() && numero.trim() !== unidad.numero) acciones.editarUnidad({ ...unidad, numero: numero.trim() });
    onClose();
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="sm" />
        {nombreUnidad(unidad)}
      </DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography color="text.secondary">{ubicacion(unidad)}</Typography>
        <Box sx={{ display: 'grid', gap: 0.75 }}>
          <Typography variant="subtitle2" component="h3">Residentes</Typography>
          {personas.length === 0 && <Typography color="text.secondary">Nadie registrado. Invita a sus residentes desde Residentes y cargos.</Typography>}
          {personas.map((p) => (
            <Typography key={p.id}>{p.nombre} <Box component="span" sx={{ color: 'text.secondary' }}>· {RELACION[p.relacion]}</Box></Typography>
          ))}
        </Box>
        <TextField size="small" label="Número" value={numero} onChange={(e) => setNumero(e.target.value)} helperText="Cámbialo solo si se registró mal." />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={guardar}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Unidades() {
  const { comunidad } = useSesion();
  const { ocupantes, unidadPorId } = useAdmin();
  const [lote, setLote] = useState(false);
  const [unidad, setUnidad] = useState(null);
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const estados = Object.fromEntries(comunidad.unidades.map((u) => [u.id, estadoOcupacion(ocupantes[u.id])]));
  const cuenta = (e) => comunidad.unidades.filter((u) => estados[u.id] === e).length;
  const texto = busqueda.trim().toLowerCase();
  const lista = comunidad.unidades
    .filter((u) => filtro === 'todas' || estados[u.id] === filtro)
    .filter((u) => !texto || `${nombreUnidad(u)} ${ubicacion(u)} ${(ocupantes[u.id] ?? []).map((o) => o.nombre).join(' ')}`.toLowerCase().includes(texto));

  return (
    <Box sx={{ maxWidth: 1300 }}>
      <Encabezado
        contexto={`${comunidad.nombre} · ${comunidad.tipo}`}
        titulo="Unidades"
        descripcion="Cada unidad recibe sus cobros y puede tener propietarios y arrendatarios."
        acciones={<Button variant="contained" startIcon={<LoteIcon />} onClick={() => setLote(true)}>Crear unidades en lote</Button>}
      />

      <FranjaKpi items={[
        { etiqueta: 'Unidades', valor: comunidad.unidades.length },
        { etiqueta: 'Vive el propietario', valor: cuenta('ocupada') },
        { etiqueta: 'Arrendadas', valor: cuenta('arrendada') },
        { etiqueta: 'Sin residentes', valor: cuenta('vacia'), color: cuenta('vacia') ? 'warning.main' : undefined, nota: cuenta('vacia') ? 'sin nadie registrado en la app' : undefined },
      ]} />

      <Tarjeta titulo="Plano de ocupación" extra="Toca una unidad para ver quién vive ahí" sx={{ mb: 2.5 }}>
        <PlanoComunidad comunidad={comunidad} estados={estados} onSelect={setUnidad} />
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
            {lista.length === 0 && <TableRow><TableCell colSpan={3}><Typography color="text.secondary" sx={{ py: 1 }}>Ninguna unidad coincide.</Typography></TableCell></TableRow>}
            {lista.map((u) => (
              <TableRow key={u.id} hover tabIndex={0} onClick={() => setUnidad(unidadPorId[u.id])} onKeyDown={(e) => e.key === 'Enter' && setUnidad(u)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ py: 1 }}><PlacaUnidad tipo={u.tipo} numero={u.numero} size="sm" /></TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{ubicacion(u)}</TableCell>
                <TableCell>
                  {(ocupantes[u.id] ?? []).length === 0
                    ? <Typography variant="body2" color="text.secondary">Sin residentes</Typography>
                    : ocupantes[u.id].map((o) => <Typography key={o.id} variant="body2">{o.nombre} <Box component="span" sx={{ color: 'text.secondary' }}>· {RELACION[o.relacion]}</Box></Typography>)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {lote && <DialogoLote onClose={() => setLote(false)} />}
      {unidad && <DialogoUnidad key={unidad.id} unidad={unidad} onClose={() => setUnidad(null)} />}
    </Box>
  );
}

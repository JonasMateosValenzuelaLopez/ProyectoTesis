import { useState } from 'react';
import { Box, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { SearchOutlined as BuscarIcon, DirectionsCarOutlined as AutoIcon } from '@mui/icons-material';
import { useAdmin } from '../../context/AdminContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { nombreUnidad } from '../../utils/formato';
import PlacaUnidad from '../marca/PlacaUnidad';

const RELACION = { propietario: 'propietario', arrendatario: 'arrendatario' };
const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\s-]/g, '');

// Búsqueda rápida por RUT, nombre, unidad o patente. Devuelve la unidad con sus residentes y vehículos.
export default function BusquedaRapida() {
  const { ocupantes } = useAdmin();
  const { unidadPorId, vehiculos, estacionamientos } = useConserjeria();
  const [texto, setTexto] = useState('');
  const q = normalizar(texto);

  const resultados = q.length < 2 ? [] : Object.values(unidadPorId).filter((u) => {
    const personas = ocupantes[u.id] ?? [];
    const campos = [
      nombreUnidad(u), u.numero, `depto${u.numero}`, `casa${u.numero}`,
      ...personas.flatMap((p) => [p.nombre, p.rut]),
      ...(vehiculos[u.id] ?? []).map((v) => v.patente),
    ];
    return campos.some((c) => normalizar(c).includes(q));
  }).slice(0, 6);

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <TextField
        fullWidth value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por RUT, nombre, unidad o patente"
        slotProps={{ input: { startAdornment: <InputAdornment position="start"><BuscarIcon /></InputAdornment> }, htmlInput: { 'aria-label': 'Búsqueda rápida' } }}
        sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper', fontSize: '1.05rem' } }}
      />
      {q.length >= 2 && (
        <Paper variant="outlined" sx={{ borderRadius: 3 }}>
          {resultados.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Nada coincide con «{texto}».</Typography>}
          {resultados.map((u, i) => {
            const personas = ocupantes[u.id] ?? [];
            const autos = vehiculos[u.id] ?? [];
            return (
              <Box key={u.id} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, p: 2, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <PlacaUnidad tipo={u.tipo} numero={u.numero} size="md" />
                <Box sx={{ display: 'grid', gap: 0.75, minWidth: 0 }}>
                  {personas.length === 0 && <Typography color="text.secondary">Sin residentes registrados</Typography>}
                  {personas.map((p) => (
                    <Box key={p.id} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <Typography sx={{ fontWeight: 700 }}>{p.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.rut} · {RELACION[p.relacion]}</Typography>
                      {p.telefono && <Typography component="a" href={`tel:${p.telefono.replace(/\s/g, '')}`} variant="body2" sx={{ color: 'bronce.main', fontWeight: 700 }}>{p.telefono}</Typography>}
                    </Box>
                  ))}
                  {(autos.length > 0 || estacionamientos[u.id]) && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', color: 'text.secondary' }}>
                      <AutoIcon fontSize="small" />
                      {autos.map((v) => (
                        <Typography key={v.patente} variant="body2">
                          <Box component="span" sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, color: 'text.primary', border: 1.5, borderColor: 'text.primary', borderRadius: 1, px: 0.75, mr: 0.75 }}>{v.patente}</Box>
                          {v.modelo}
                        </Typography>
                      ))}
                      {estacionamientos[u.id] && <Typography variant="body2">Estacionamiento {estacionamientos[u.id]}</Typography>}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Paper>
      )}
    </Box>
  );
}

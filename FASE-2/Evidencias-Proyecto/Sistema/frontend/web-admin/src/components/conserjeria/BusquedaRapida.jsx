import { useState } from 'react';
import { Box, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { SearchOutlined as BuscarIcon, DirectionsCarOutlined as AutoIcon } from '@mui/icons-material';
import { useAdmin } from '../../context/AdminContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { nombreCompleto, nombreUnidad, telefono } from '../../utils/formato';
import PlacaUnidad from '../marca/PlacaUnidad';

const normalizar = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.\s-]/g, '');

// Búsqueda rápida por RUT, nombre, unidad o patente. Devuelve la unidad con sus residentes y vehículos.
export default function BusquedaRapida() {
  const { ocupantes } = useAdmin();
  const { unidadPorId, vehiculos, estacionamientos } = useConserjeria();
  const [texto, setTexto] = useState('');
  const q = normalizar(texto);

  const resultados = q.length < 2 ? [] : Object.values(unidadPorId).filter((u) => {
    const personas = ocupantes[u.id_unidad] ?? [];
    const campos = [
      nombreUnidad(u), u.numero_identificador, `depto${u.numero_identificador}`, `casa${u.numero_identificador}`,
      ...personas.flatMap((p) => [nombreCompleto(p), p.rut]),
      ...(vehiculos[u.id_unidad] ?? []).map((v) => v.patente),
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
        <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
          {resultados.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Nada coincide con «{texto}».</Typography>}
          {resultados.map((u, i) => {
            const personas = ocupantes[u.id_unidad] ?? [];
            const autos = vehiculos[u.id_unidad] ?? [];
            return (
              <Box key={u.id_unidad} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, p: 2, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <PlacaUnidad unidad={u} size="md" />
                <Box sx={{ display: 'grid', gap: 0.75, minWidth: 0 }}>
                  {personas.length === 0 && <Typography color="text.secondary">Sin residentes registrados</Typography>}
                  {personas.map((p) => (
                    <Box key={p.id_usuario} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <Typography sx={{ fontWeight: 700 }}>{nombreCompleto(p)}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.rut} · {p.relacion.toLowerCase()}</Typography>
                      {p.telefono && <Typography component="a" href={`tel:${p.telefono}`} variant="body2" sx={{ color: 'bronce.main', fontWeight: 700 }}>{telefono(p.telefono)}</Typography>}
                    </Box>
                  ))}
                  {(autos.length > 0 || estacionamientos[u.id_unidad]) && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', color: 'text.secondary' }}>
                      <AutoIcon fontSize="small" />
                      {autos.map((v) => (
                        <Typography key={v.patente} variant="body2">
                          <Box component="span" sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, color: 'text.primary', border: 1.5, borderColor: 'text.primary', borderRadius: 1, px: 0.75, mr: 0.75 }}>{v.patente}</Box>
                          {v.modelo}
                        </Typography>
                      ))}
                      {estacionamientos[u.id_unidad] && <Typography variant="body2">Estacionamiento {estacionamientos[u.id_unidad]}</Typography>}
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

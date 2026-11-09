import { useEffect, useState } from 'react';
import { Box, CircularProgress, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import { SearchOutlined as BuscarIcon, DirectionsCarOutlined as AutoIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as porteria from '../../api/porteria';
import { useConsulta } from '../../api/useConsulta';
import { telefono } from '../../utils/formato';
import { conTipo } from '../../utils/unidades';
import PlacaUnidad from '../marca/PlacaUnidad';

// Espera a que se deje de escribir antes de buscar
function useRetrasado(valor, ms) {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}

// Búsqueda rápida por RUT, nombre, unidad o patente (GET porteria/busqueda, hasta 8 unidades)
// con los residentes que tienen acceso a la comunidad y sus vehículos.
export default function BusquedaRapida() {
  const { comunidad } = useSesion();
  const [texto, setTexto] = useState('');
  const q = useRetrasado(texto.trim(), 350);
  const { datos, cargando, error } = useConsulta(() => (q.length >= 2 ? porteria.buscar(q) : Promise.resolve(null)), [comunidad.idRed, q]);
  const resultados = datos?.resultados ?? [];

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      <TextField
        fullWidth value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por RUT, nombre, unidad o patente"
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start"><BuscarIcon /></InputAdornment>,
            endAdornment: q.length >= 2 && cargando ? <InputAdornment position="end"><CircularProgress size={18} aria-label="Buscando" /></InputAdornment> : undefined,
          },
          htmlInput: { 'aria-label': 'Búsqueda rápida', maxLength: 50 },
        }}
        sx={{ '& .MuiInputBase-root': { bgcolor: 'background.paper', fontSize: '1.05rem' } }}
      />
      {q.length >= 2 && (datos || error) && (
        <Paper variant="outlined" sx={{ borderRadius: 1.5 }}>
          {error && <Typography color="error" sx={{ p: 2 }}>{error.message}</Typography>}
          {!error && resultados.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>Nada coincide con «{q}».</Typography>}
          {resultados.map((r, i) => {
            const u = conTipo(r.unidad, comunidad);
            return (
              <Box key={r.unidad.idUnidad} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 2, p: 2, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
                <PlacaUnidad unidad={u} size="md" />
                <Box sx={{ display: 'grid', gap: 0.75, minWidth: 0 }}>
                  {r.residentes.length === 0 && <Typography color="text.secondary">Sin residentes con acceso a la app</Typography>}
                  {r.residentes.map((p) => (
                    <Box key={p.idUsuario} sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'baseline' }}>
                      <Typography sx={{ fontWeight: 700 }}>{p.nombre}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.tipoResidencia.toLowerCase()}</Typography>
                      {p.telefono && <Typography component="a" href={`tel:${p.telefono}`} variant="body2" sx={{ color: 'bronce.main', fontWeight: 700 }}>{telefono(p.telefono)}</Typography>}
                    </Box>
                  ))}
                  {r.vehiculos.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center', color: 'text.secondary' }}>
                      <AutoIcon fontSize="small" />
                      {r.vehiculos.map((v) => (
                        <Typography key={v.patente} variant="body2">
                          <Box component="span" sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, color: 'text.primary', border: 1.5, borderColor: 'text.primary', borderRadius: 1, px: 0.75, mr: 0.75 }}>{v.patente}</Box>
                          {[v.marca, v.modelo, v.color].filter(Boolean).join(' ')}{v.estacionamiento ? ` · estacionamiento ${v.estacionamiento}` : ''}
                        </Typography>
                      ))}
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

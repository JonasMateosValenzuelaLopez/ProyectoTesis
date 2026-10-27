import { useEffect, useState } from 'react';
import { Box, Paper, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { LoginOutlined as EntraIcon, LogoutOutlined as SaleIcon } from '@mui/icons-material';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { nombreUnidad } from '../../utils/formato';

const CATEGORIA = { residente: 'Residente', visita: 'Visita', delivery: 'Delivery', proveedor: 'Proveedor' };
const horaSeg = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const resaltar = keyframes`
  from { background-color: var(--resalte); }
  to { background-color: transparent; }
`;
const pulso = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(31, 138, 76, 0.5); }
  100% { box-shadow: 0 0 0 8px rgba(31, 138, 76, 0); }
`;

function hace(iso, ahora) {
  const s = Math.max(0, Math.round((ahora - new Date(iso)) / 1000));
  if (s < 60) return 'recién';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

// Registro de accesos en vivo: lo último arriba, lo nuevo se resalta un momento.
export default function MonitorAccesos() {
  const { accesos, enVivo, unidadPorId } = useConserjeria();
  const [filtro, setFiltro] = useState('todos');
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const lista = accesos.filter((a) => filtro === 'todos' || (filtro === 'visitas' ? a.categoria !== 'residente' : a.categoria === 'residente')).slice(0, 40);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, display: 'grid', gridTemplateRows: 'auto 1fr', minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Typography variant="h6" component="h2">Accesos</Typography>
          {enVivo && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, color: 'success.main', fontWeight: 700, fontSize: '0.8rem' }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', animation: `${pulso} 1.6s ease-out infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
              En vivo
            </Box>
          )}
        </Box>
        <ToggleButtonGroup size="small" exclusive value={filtro} onChange={(_, v) => v && setFiltro(v)}>
          <ToggleButton value="todos">Todos</ToggleButton>
          <ToggleButton value="visitas">Visitas</ToggleButton>
          <ToggleButton value="residentes">Residentes</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Box sx={{ overflowY: 'auto', maxHeight: { lg: 640 } }} aria-live="polite">
        {lista.length === 0 && <Typography color="text.secondary" sx={{ p: 2.5 }}>Sin movimientos registrados hoy.</Typography>}
        {lista.map((a, i) => {
          const entra = a.sentido === 'ingreso';
          const nuevo = ahora - new Date(a.fecha) < 20000;
          return (
            <Box
              key={a.id}
              sx={(t) => ({
                '--resalte': t.palette.marca.signalSoft,
                display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', px: 2.5, py: 1.25,
                borderTop: i ? 1 : 0, borderColor: 'divider',
                animation: nuevo ? `${resaltar} 2.5s ease-out` : 'none',
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              })}
            >
              <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: entra ? 'success.light' : 'action.hover', color: entra ? 'success.main' : 'text.secondary' }}>
                {entra ? <EntraIcon fontSize="small" aria-label="Entra" /> : <SaleIcon fontSize="small" aria-label="Sale" />}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700 }} noWrap>{a.persona}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {CATEGORIA[a.categoria]} · {nombreUnidad(unidadPorId[a.idUnidad])} · {a.metodo}{a.patente ? ` · ${a.patente}` : ''}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{horaSeg.format(new Date(a.fecha))}</Typography>
                <Typography variant="caption" color="text.secondary">{hace(a.fecha, ahora)}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

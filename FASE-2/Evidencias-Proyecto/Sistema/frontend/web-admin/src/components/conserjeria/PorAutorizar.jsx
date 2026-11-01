import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { CallOutlined as LlamarIcon, WhatsApp as WhatsAppIcon } from '@mui/icons-material';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { residentes } from '../../data/finanzasMock';
import { nombreUnidad } from '../../utils/formato';
import { soloDigitos, telefonoResidente } from '../../utils/porteria';
import PlacaUnidad from '../marca/PlacaUnidad';

const latido = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

function espera(iso, ahora) {
  const s = Math.max(0, Math.round((ahora - new Date(iso)) / 1000));
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min`;
}

// Ingresos sin invitación que esperan al residente. Se le avisó en la app; si no responde,
// el conserje le escribe o le llama y registra lo que dijo.
export default function PorAutorizar() {
  const { porAutorizar, unidadPorId, acciones } = useConserjeria();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', borderColor: 'marca.signal', borderWidth: 2 }}>
      <Box sx={{ bgcolor: 'marca.signal', color: 'marca.signalInk', px: 2.5, py: 1.25 }}>
        <Typography sx={{ fontWeight: 800 }} component="h2">
          {porAutorizar.length === 1 ? 'Esperando autorización del residente' : `${porAutorizar.length} ingresos esperando autorización`}
        </Typography>
      </Box>
      {porAutorizar.map((s, i) => {
        const u = unidadPorId[s.id_unidad];
        const nombre = residentes[u.id_unidad] ?? 'Residente';
        const telefono = telefonoResidente(u);
        const mensaje = `Hola ${nombre.split(' ')[0]}, le escribimos de conserjería. En portería está ${s.persona} (${s.categoria.toLowerCase()}) que va a su ${nombreUnidad(u)}. ¿Lo dejamos pasar?`;
        return (
          <Box key={s.id_acceso} sx={{ display: 'grid', gap: 1.5, px: 2.5, py: 2, borderTop: i ? 1 : 0, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <PlacaUnidad unidad={u} size="sm" />
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{s.persona}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {s.categoria} para {nombre} · {nombreUnidad(u)}{s.patente ? ` · ${s.patente}` : ''}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{espera(s.fecha_ingreso, ahora)}</Typography>
                <Typography variant="caption" color="text.secondary">esperando</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', animation: `${latido} 1.6s ease-in-out infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
              Le avisamos en la app. Si no responde, escríbele o llámale al {telefono}.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" startIcon={<WhatsAppIcon />} href={`https://wa.me/${soloDigitos(telefono)}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener">WhatsApp</Button>
              <Button variant="outlined" startIcon={<LlamarIcon />} href={`tel:+${soloDigitos(telefono)}`}>Llamar</Button>
              <Box sx={{ flex: 1 }} />
              <Button color="error" onClick={() => acciones.resolverAutorizacion(s, false)}>No autorizó</Button>
              <Button variant="contained" onClick={() => acciones.resolverAutorizacion(s, true)}>Autorizó, dejar pasar</Button>
            </Box>
          </Box>
        );
      })}
    </Paper>
  );
}

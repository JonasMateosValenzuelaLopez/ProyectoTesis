import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { PersonAddAlt1Outlined as IngresoIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useConserjeria } from '../../context/ConserjeriaContext';
import { hoyTexto } from '../../utils/formato';
import ValidarQR from '../../components/conserjeria/ValidarQR';
import VisitasHoy from '../../components/conserjeria/VisitasHoy';
import MonitorAccesos from '../../components/conserjeria/MonitorAccesos';
import BusquedaRapida from '../../components/conserjeria/BusquedaRapida';
import DialogoIngreso from '../../components/conserjeria/DialogoIngreso';

const horaSeg = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

function Reloj() {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <Typography component="time" sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '2rem', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
      {horaSeg.format(ahora)}
    </Typography>
  );
}

// Garita: pensada para una tablet en la portería. Lo urgente (validar y buscar) arriba
// y a la izquierda; el registro en vivo a la derecha.
export default function Porteria() {
  const { comunidad } = useSesion();
  const { esperadas, adentro } = useConserjeria();
  const [ingreso, setIngreso] = useState(false);

  return (
    <Box sx={{ maxWidth: 1500 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
        <Box>
          <Typography color="text.secondary" variant="body2">{comunidad.nombre} · {hoyTexto()}</Typography>
          <Typography variant="h4" component="h1">Garita</Typography>
          <Typography color="text.secondary">{esperadas.length} visitas por llegar · {adentro.length} adentro</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="outlined" size="large" startIcon={<IngresoIcon />} onClick={() => setIngreso(true)}>Ingreso sin invitación</Button>
          <Reloj />
        </Box>
      </Box>

      <Box sx={{ mb: 2.5 }}><BusquedaRapida /></Box>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <ValidarQR />
          <VisitasHoy />
        </Box>
        <MonitorAccesos />
      </Box>

      {ingreso && <DialogoIngreso onClose={() => setIngreso(false)} />}
    </Box>
  );
}

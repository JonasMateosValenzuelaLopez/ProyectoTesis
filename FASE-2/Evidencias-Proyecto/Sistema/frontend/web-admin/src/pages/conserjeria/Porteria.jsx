import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { PersonAddAlt1Outlined as IngresoIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import * as porteria from '../../api/porteria';
import * as admin from '../../api/admin';
import { useConsulta } from '../../api/useConsulta';
import { usePaginado } from '../../api/usePaginado';
import { hoyTexto } from '../../utils/formato';
import EstadoCarga from '../../components/ui/EstadoCarga';
import ValidarQR from '../../components/conserjeria/ValidarQR';
import VisitasHoy from '../../components/conserjeria/VisitasHoy';
import MonitorAccesos from '../../components/conserjeria/MonitorAccesos';
import BusquedaRapida from '../../components/conserjeria/BusquedaRapida';
import DialogoIngreso from '../../components/conserjeria/DialogoIngreso';
import PorAutorizar from '../../components/conserjeria/PorAutorizar';

const horaSeg = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
const ACTUALIZAR_MS = 15000;
const idAcceso = (a) => a.idAcceso;

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

// Garita (Conserjería y Administración), pensada para una tablet en la portería. Lo urgente (validar y buscar)
// arriba y a la izquierda; el registro de accesos a la derecha. Sin tiempo real en la API todavía, el resumen
// y el historial se vuelven a pedir cada 15 segundos.
export default function Porteria() {
  const { comunidad } = useSesion();
  const resumen = useConsulta(porteria.resumen, [comunidad.idRed]);
  const historial = usePaginado(porteria.monitor, [comunidad.idRed], 'accesos', idAcceso);
  const unidades = useConsulta(admin.listarUnidades, [comunidad.idRed]);
  const [ingreso, setIngreso] = useState(null);
  const { recargar: recargarResumen } = resumen;
  const { recargar: recargarHistorial } = historial;

  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => { setAhora(Date.now()); recargarResumen(); recargarHistorial(); }, ACTUALIZAR_MS);
    return () => clearInterval(t);
  }, [recargarResumen, recargarHistorial]);
  const actualizar = () => { recargarResumen(); recargarHistorial(); };

  const r = resumen.datos;
  return (
    <Box sx={{ maxWidth: 1500 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
        <Box>
          <Typography color="text.secondary" variant="body2">{comunidad.nombre} · {hoyTexto()}</Typography>
          <Typography variant="h4" component="h1">Garita</Typography>
          {r && (
            <Typography color="text.secondary">
              {r.esperadas.length} visitas por llegar · {r.adentro.length} adentro{r.porAutorizar.length ? ` · ${r.porAutorizar.length} esperando autorización` : ''}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant="outlined" size="large" startIcon={<IngresoIcon />} onClick={() => setIngreso({})} disabled={!unidades.datos}>Ingreso sin invitación</Button>
          <Reloj />
        </Box>
      </Box>

      {r?.porAutorizar.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <PorAutorizar accesos={r.porAutorizar} onCambio={actualizar} onRegistrarDeNuevo={(s) => setIngreso({ inicial: s })} />
        </Box>
      )}

      <Box sx={{ mb: 2.5 }}><BusquedaRapida /></Box>

      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: { xs: '1fr', lg: '1.15fr 1fr' }, alignItems: 'start' }}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <ValidarQR onIngreso={actualizar} />
          {!r ? <EstadoCarga cargando={resumen.cargando} error={resumen.error} onReintentar={recargarResumen} />
            : <VisitasHoy esperadas={r.esperadas} adentro={r.adentro} ahora={ahora} onCambio={actualizar} />}
        </Box>
        <MonitorAccesos paginado={historial} />
      </Box>

      {ingreso && unidades.datos && (
        <DialogoIngreso unidades={unidades.datos} inicial={ingreso.inicial} onClose={() => setIngreso(null)} onRegistrado={actualizar} />
      )}
    </Box>
  );
}

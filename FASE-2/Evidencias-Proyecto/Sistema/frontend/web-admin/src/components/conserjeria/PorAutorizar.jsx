import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { keyframes } from '@mui/system';
import { CallOutlined as LlamarIcon, WhatsApp as WhatsAppIcon } from '@mui/icons-material';
import { useSesion } from '../../context/SesionContext';
import { useAviso } from '../../context/AvisoContext';
import * as porteria from '../../api/porteria';
import { useConsulta } from '../../api/useConsulta';
import { nombreUnidad, telefono } from '../../utils/formato';
import { expiraEn, soloDigitos } from '../../utils/porteria';
import { conTipo } from '../../utils/unidades';
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

// Una llegada esperando al residente. Se le avisó en la app; si no responde, la garita le escribe o le llama
// (el teléfono sale de la búsqueda de la unidad) y registra lo que dijo (POST porteria/accesos/:id/autorizacion).
function Solicitud({ s, ahora, primera, onCambio, onRegistrarDeNuevo }) {
  const { comunidad } = useSesion();
  const { avisar, avisarError } = useAviso();
  const [enviando, setEnviando] = useState(null);
  const u = conTipo(s.unidad, comunidad);
  const ficha = useConsulta(() => (s.unidad ? porteria.buscar(s.unidad.numeroIdentificador) : Promise.resolve(null)), [s.idAcceso]);
  const residentes = ficha.datos?.resultados.find((r) => r.unidad.idUnidad === s.unidad?.idUnidad)?.residentes ?? [];
  const contacto = residentes.find((r) => r.telefono);
  const expirada = ahora >= expiraEn(s);

  const resolver = async (aprobado) => {
    setEnviando(aprobado ? 'si' : 'no');
    try {
      await porteria.resolverPorTelefono(s.idAcceso, aprobado);
      avisar(aprobado ? `${s.visitante} puede pasar.` : `Ingreso de ${s.visitante} rechazado.`);
      onCambio();
    } catch (err) {
      avisarError(err.message);
      onCambio();
    } finally {
      setEnviando(null);
    }
  };

  if (expirada) {
    return (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', px: 2.5, py: 1.5, borderTop: primera ? 0 : 1, borderColor: 'divider', bgcolor: 'background.default' }}>
        {u && <PlacaUnidad unidad={u} size="sm" />}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 700 }}>{s.visitante}{u ? ` · ${nombreUnidad(u)}` : ''}</Typography>
          <Typography variant="body2" color="text.secondary">Pasaron 30 minutos sin respuesta y la solicitud expiró. Si sigue en la garita, regístrala de nuevo.</Typography>
        </Box>
        <Button variant="outlined" onClick={() => onRegistrarDeNuevo(s)}>Registrar de nuevo</Button>
      </Box>
    );
  }

  const nombre = contacto?.nombre ?? 'Residente';
  const mensaje = `Hola ${nombre.split(' ')[0]}, le escribimos de conserjería. En portería está ${s.visitante} (${s.categoria.toLowerCase()}) que va a su ${nombreUnidad(u)}. ¿Lo dejamos pasar?`;
  return (
    <Box sx={{ display: 'grid', gap: 1.5, px: 2.5, py: 2, borderTop: primera ? 0 : 1, borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {u && <PlacaUnidad unidad={u} size="sm" />}
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.125rem' }}>{s.visitante}</Typography>
          <Typography variant="body2" color="text.secondary">
            {s.categoria} para {residentes.length ? residentes.map((r) => r.nombre).join(', ') : nombreUnidad(u)}{s.patente ? ` · ${s.patente}` : ''}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{espera(s.llegada, ahora)}</Typography>
          <Typography variant="caption" color="text.secondary">esperando</Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box component="span" sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', flexShrink: 0, animation: `${latido} 1.6s ease-in-out infinite`, '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }} />
        Le avisamos en la app.{contacto ? ` Si no responde, escríbele o llámale al ${telefono(contacto.telefono)}.` : ' No tiene teléfono registrado.'} Expira en {Math.max(1, Math.ceil((expiraEn(s) - ahora) / 60000))} min.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {contacto && (
          <>
            <Button variant="outlined" startIcon={<WhatsAppIcon />} href={`https://wa.me/${soloDigitos(contacto.telefono)}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener">WhatsApp</Button>
            <Button variant="outlined" startIcon={<LlamarIcon />} href={`tel:+${soloDigitos(contacto.telefono)}`}>Llamar</Button>
          </>
        )}
        <Box sx={{ flex: 1 }} />
        <Button color="error" loading={enviando === 'no'} disabled={!!enviando} onClick={() => resolver(false)}>No autorizó</Button>
        <Button variant="contained" loading={enviando === 'si'} disabled={!!enviando} onClick={() => resolver(true)}>Autorizó, dejar pasar</Button>
      </Box>
    </Box>
  );
}

// Ingresos sin invitación que esperan al residente (`porAutorizar` de GET porteria/resumen).
export default function PorAutorizar({ accesos, onCambio, onRegistrarDeNuevo }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const vigentes = accesos.filter((s) => ahora < expiraEn(s)).length;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 1.5, overflow: 'hidden', borderColor: 'marca.signal', borderWidth: 2 }}>
      <Box sx={{ bgcolor: 'marca.signal', color: 'marca.signalInk', px: 2.5, py: 1.25 }}>
        <Typography sx={{ fontWeight: 800 }} component="h2">
          {vigentes === 0 ? 'Solicitudes de ingreso expiradas'
            : vigentes === 1 ? 'Esperando autorización del residente' : `${vigentes} ingresos esperando autorización`}
        </Typography>
      </Box>
      {accesos.map((s, i) => (
        <Solicitud key={s.idAcceso} s={s} ahora={ahora} primera={i === 0} onCambio={onCambio} onRegistrarDeNuevo={onRegistrarDeNuevo} />
      ))}
    </Paper>
  );
}

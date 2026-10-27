import { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, ButtonBase, Collapse, Link as MuiLink, Paper, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import { CLAVE_PRUEBA, CODIGO_PRUEBA } from '../../data/cuentasDemo';
import { formatearRut, rutValido } from '../../utils/rut';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import SelloCargo from '../../components/marca/SelloCargo';

// Las cuentas de prueba se muestran salvo que el build defina VITE_MODO_PRUEBA=false
const MODO_PRUEBA = import.meta.env.VITE_MODO_PRUEBA !== 'false';

const ocultarCorreo = (correo) => correo.replace(/^(.)[^@]*/, (_, a) => `${a}•••`);

// Panel de marca: un plano de casas dibujado con placas, algunas encendidas.
function PanelMarca() {
  const encendidas = new Set([2, 5, 9, 14, 20, 23]);
  return (
    <Box sx={{ bgcolor: 'marca.sidebar', color: 'marca.sidebarInk', p: { md: 6, lg: 8 }, display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', gap: 6 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <PlacaUnidad tipo="" numero="EC" size="sm" invertida />
        <Typography sx={{ color: '#fff', fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.3rem' }}>EntreCasas</Typography>
      </Box>
      <Box sx={{ display: 'grid', gap: 3, maxWidth: 520 }}>
        <Typography component="p" sx={{ color: '#fff', fontFamily: 'Archivo, sans-serif', fontStretch: '115%', fontWeight: 800, fontSize: { md: '2.6rem', lg: '3.2rem' }, lineHeight: 1.05 }}>
          La comunidad, casa por casa.
        </Typography>
        <Typography sx={{ fontSize: '1.1rem', maxWidth: '40ch' }}>
          Cobros, votaciones, comunicados y portería en un solo lugar para la directiva, la administración y la conserjería.
        </Typography>
      </Box>
      <Box aria-hidden sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 0.75, maxWidth: 520 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <Box key={i} sx={{
            aspectRatio: '1', borderRadius: '4px', border: '1.5px solid',
            borderColor: encendidas.has(i) ? 'marca.bronzeOnSidebar' : 'rgba(199, 210, 205, 0.25)',
            bgcolor: encendidas.has(i) ? 'marca.bronzeOnSidebar' : 'transparent',
          }} />
        ))}
      </Box>
    </Box>
  );
}

function CuentasPrueba({ onElegir }) {
  const { cuentas } = useSesion();
  const [abierto, setAbierto] = useState(true);
  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, borderStyle: 'dashed', overflow: 'hidden' }}>
      <ButtonBase onClick={() => setAbierto(!abierto)} aria-expanded={abierto} sx={{ width: '100%', justifyContent: 'space-between', gap: 2, px: 2, py: 1.5, textAlign: 'left' }}>
        <Box>
          <Typography sx={{ fontWeight: 700 }}>Cuentas de prueba</Typography>
          <Typography variant="body2" color="text.secondary">Clave para todas: <b>{CLAVE_PRUEBA}</b> · código por correo: <b>{CODIGO_PRUEBA}</b></Typography>
        </Box>
        <Typography variant="body2" color="bronce.main" sx={{ fontWeight: 700 }}>{abierto ? 'Ocultar' : 'Ver'}</Typography>
      </ButtonBase>
      <Collapse in={abierto}>
        <Box sx={{ display: 'grid', borderTop: 1, borderColor: 'divider', maxHeight: 320, overflowY: 'auto' }}>
          {cuentas.map((c, i) => (
            <ButtonBase
              key={c.id} onClick={() => onElegir(c)}
              sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.5, alignItems: 'center', px: 2, py: 1, textAlign: 'left', borderTop: i ? 1 : 0, borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
            >
              {c.plataforma
                ? <Box sx={{ width: 22, height: 22, borderRadius: '5px', bgcolor: 'marca.signal', color: 'marca.signalInk', display: 'grid', placeItems: 'center', fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 11 }}>EC</Box>
                : <SelloCargo cargo={c.membresias[0]?.cargo ?? 'residente'} />}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.nombre} {c.apellido}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{c.flujo}</Typography>
              </Box>
              <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary', whiteSpace: 'nowrap' }}>{c.rut}</Typography>
            </ButtonBase>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

// Entrada al panel con RUT y clave, o con un código de un solo uso enviado al correo.
export default function Login() {
  const navigate = useNavigate();
  const { usuario, cuentas, bloqueados, iniciarSesion, membresiasVigentes } = useSesion();
  const [rut, setRut] = useState('');
  const [metodo, setMetodo] = useState('clave');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEnviadoA, setCodigoEnviadoA] = useState(null);
  const [error, setError] = useState(null);

  if (usuario) return <Navigate to={usuario.plataforma ? '/plataforma' : '/panel'} replace />;

  const rutMal = rut.length > 3 && !rutValido(rut);

  const entrar = (c) => {
    if (bloqueados.includes(c.rut)) {
      setError('Tu cuenta está bloqueada. Escribe a soporte@entrecasas.cl para revisarla.');
      return;
    }
    if (c.plataforma) {
      iniciarSesion(c);
      navigate('/plataforma');
      return;
    }
    if (c.membresias.length === 0) {
      setError('residente');
      return;
    }
    if (membresiasVigentes(c).length === 0) {
      setError('Tu comunidad está suspendida en EntreCasas. Habla con tu administración.');
      return;
    }
    iniciarSesion(c);
    navigate('/panel');
  };

  const enviar = (e) => {
    e.preventDefault();
    setError(null);
    if (!rutValido(rut)) {
      setError('Revisa el RUT: el dígito verificador no calza.');
      return;
    }
    const c = cuentas.find((x) => x.rut === formatearRut(rut));
    if (metodo === 'clave') {
      if (!c || clave !== CLAVE_PRUEBA) setError('RUT o clave incorrectos.');
      else entrar(c);
      return;
    }
    if (!codigoEnviadoA) {
      // No se revela si el RUT existe: siempre se responde que se envió el código
      setCodigoEnviadoA(c ? ocultarCorreo(c.correo) : 'tu correo registrado');
      return;
    }
    if (!c || codigo !== CODIGO_PRUEBA) setError('El código no es válido o ya venció.');
    else entrar(c);
  };

  const elegirCuenta = (c) => {
    setRut(c.rut);
    setMetodo('clave');
    setClave(CLAVE_PRUEBA);
    setCodigoEnviadoA(null);
    setError(null);
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: 2, py: { xs: 4, md: 6 } }}>
        <Box sx={{ width: '100%', maxWidth: 420, display: 'grid', gap: 3 }}>
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.25 }}>
            <PlacaUnidad tipo="" numero="EC" size="sm" />
            <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontStretch: '110%', fontWeight: 800, fontSize: '1.2rem' }}>EntreCasas</Typography>
          </Box>
          <Box>
            <Typography variant="h4" component="h1">Entrar al panel</Typography>
            <Typography color="text.secondary">Para la directiva, la administración, la conserjería y el equipo de EntreCasas.</Typography>
          </Box>

          <Box component="form" onSubmit={enviar} noValidate sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="RUT" value={rut} autoComplete="username" placeholder="12.345.678-5"
              onChange={(e) => { setRut(e.target.value); setCodigoEnviadoA(null); }}
              onBlur={() => rutValido(rut) && setRut(formatearRut(rut))}
              error={rutMal} helperText={rutMal ? 'RUT no válido' : ' '}
            />
            <ToggleButtonGroup exclusive fullWidth size="small" value={metodo} onChange={(_, v) => { if (v) { setMetodo(v); setError(null); setCodigoEnviadoA(null); } }}>
              <ToggleButton value="clave">Con clave</ToggleButton>
              <ToggleButton value="codigo">Con código por correo</ToggleButton>
            </ToggleButtonGroup>

            {metodo === 'clave' && (
              <TextField label="Clave" type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" />
            )}
            {metodo === 'codigo' && codigoEnviadoA && (
              <>
                <Alert severity="info" variant="outlined">Enviamos un código de 6 dígitos a {codigoEnviadoA}. Vence en 10 minutos.</Alert>
                <TextField
                  label="Código" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus
                  slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'one-time-code', style: { letterSpacing: '0.4em', fontVariantNumeric: 'tabular-nums' } } }}
                />
              </>
            )}

            {error && error !== 'residente' && <Alert severity="error">{error}</Alert>}
            {error === 'residente' && (
              <Alert severity="info">Tu cuenta es de residente. Entra desde la app EntreCasas en tu teléfono: ahí ves tus gastos comunes, invitas visitas y reservas espacios.</Alert>
            )}

            <Button type="submit" variant="contained" size="large">
              {metodo === 'codigo' && !codigoEnviadoA ? 'Enviarme un código' : 'Entrar'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <MuiLink component={RouterLink} to="/recuperar-password" variant="body2">¿Olvidaste tu clave?</MuiLink>
            <MuiLink component={RouterLink} to="/solicitar-acceso" variant="body2">Solicitar acceso a mi vivienda</MuiLink>
          </Box>

          {MODO_PRUEBA && <CuentasPrueba onElegir={elegirCuenta} />}
        </Box>
      </Box>
    </Box>
  );
}

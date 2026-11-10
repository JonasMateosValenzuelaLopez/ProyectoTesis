import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Link as MuiLink, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useSesion } from '../../context/SesionContext';
import * as auth from '../../api/auth';
import { comunidadesPanel } from '../../config/roles';
import { formatearRut, rutValido } from '../../utils/rut';
import PlacaUnidad from '../../components/marca/PlacaUnidad';
import PanelMarca from '../../components/marca/PanelMarca';
import SelectorTema from '../../components/SelectorTema';
import PasoSesion from '../../components/marca/PasoSesion';
import CampoClave from '../../components/ui/CampoClave';

// A dónde va cada persona al entrar: Plataforma, elegir comunidad o el panel de su única comunidad.
// Si venía de una página (la sesión expiró), vuelve a ella.
function destinoDe(usuario, desde) {
  const grupos = comunidadesPanel(usuario);
  if (usuario.esPlataforma && grupos.length === 0) {
    return { ruta: desde?.startsWith('/plataforma') ? desde : '/plataforma', detalle: 'la plataforma' };
  }
  if (grupos.length > 1) return { ruta: '/elegir-comunidad', detalle: null };
  return { ruta: desde?.startsWith('/panel') ? desde : '/panel', detalle: grupos[0].comunidad.nombre };
}

// Entrada al panel con RUT y clave, o con un código de un solo uso que llega al correo (auth/codigo).
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, motivoSalida, iniciarSesion } = useSesion();
  const [rut, setRut] = useState('');
  const [metodo, setMetodo] = useState('clave');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoPedido, setCodigoPedido] = useState(null);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // Respuesta del login mientras se muestra la transición de entrada
  const [entrando, setEntrando] = useState(null);

  if (usuario && !entrando) return <Navigate to={usuario.esPlataforma && !comunidadesPanel(usuario).length ? '/plataforma' : '/panel'} replace />;

  const rutMal = rut.length > 3 && !rutValido(rut);

  // Solo entran al panel quienes tienen un cargo o son del equipo EntreCasas; los residentes usan la app
  const recibir = (respuesta) => {
    const u = respuesta.usuario;
    if (!u.esPlataforma && comunidadesPanel(u).length === 0) {
      setError('residente');
      return;
    }
    const destino = destinoDe(u, location.state?.desde);
    if (!destino.detalle) {
      iniciarSesion(respuesta);
      navigate(destino.ruta, { replace: true });
      return;
    }
    setEntrando({ respuesta, destino });
  };
  const abrirSesion = () => {
    iniciarSesion(entrando.respuesta);
    navigate(entrando.destino.ruta, { replace: true });
  };

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    if (!rutValido(rut)) {
      setError('Revisa el RUT: el dígito verificador no calza.');
      return;
    }
    const identificador = formatearRut(rut);
    setEnviando(true);
    try {
      if (metodo === 'clave') recibir(await auth.login(identificador, clave));
      else if (!codigoPedido) setCodigoPedido((await auth.pedirCodigo(identificador)).mensaje);
      else recibir(await auth.verificarCodigo(identificador, codigo));
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Box component="main" sx={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' }, bgcolor: 'background.paper' }}>
      <PanelMarca />
      <SelectorTema flotante />
      {entrando && <PasoSesion tipo="entrar" nombre={entrando.respuesta.usuario.nombre} detalle={entrando.destino.detalle} alTerminar={abrirSesion} />}

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

          {motivoSalida && <Alert severity="warning" variant="outlined">{motivoSalida}</Alert>}

          <Box component="form" onSubmit={enviar} noValidate sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="RUT" value={rut} autoComplete="username" placeholder="12.345.678-5"
              onChange={(e) => { setRut(e.target.value); setCodigoPedido(null); }}
              onBlur={() => rutValido(rut) && setRut(formatearRut(rut))}
              error={rutMal} helperText={rutMal ? 'RUT no válido' : ' '}
            />
            <ToggleButtonGroup exclusive fullWidth size="small" value={metodo} onChange={(_, v) => { if (v) { setMetodo(v); setError(null); setCodigoPedido(null); } }}>
              <ToggleButton value="clave">Con clave</ToggleButton>
              <ToggleButton value="codigo">Con código por correo</ToggleButton>
            </ToggleButtonGroup>

            {metodo === 'clave' && (
              <CampoClave label="Clave" value={clave} onChange={(e) => setClave(e.target.value)} autoComplete="current-password" />
            )}
            {metodo === 'codigo' && codigoPedido && (
              <>
                <Alert severity="info" variant="outlined">{codigoPedido} Vence en 10 minutos.</Alert>
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

            <Button
              type="submit" variant="contained" size="large" loading={enviando}
              disabled={!rut.trim() || (metodo === 'clave' && !clave) || (metodo === 'codigo' && !!codigoPedido && codigo.length !== 6)}
            >
              {metodo === 'codigo' && !codigoPedido ? 'Enviarme un código' : 'Entrar'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <MuiLink component={RouterLink} to="/recuperar-password" variant="body2">¿Olvidaste tu clave?</MuiLink>
            <MuiLink component={RouterLink} to="/solicitar-acceso" variant="body2">Solicitar acceso a mi vivienda</MuiLink>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

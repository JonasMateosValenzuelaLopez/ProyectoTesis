import { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useSesion } from '../context/SesionContext';
import * as auth from '../api/auth';
import Encabezado from '../components/ui/Encabezado';
import Tarjeta from '../components/ui/Tarjeta';
import CampoClave from '../components/ui/CampoClave';
import { errorClaveNueva } from '../utils/clave';
import { formatearRut } from '../utils/rut';
import { fechaHora, nombreCompleto, normalizarTelefono, telefono } from '../utils/formato';

const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

// PUT auth/perfil/telefono: se cambia o se quita (null); devuelve el perfil actualizado
function Telefono() {
  const { usuario, actualizarPerfil } = useSesion();
  const [tel, setTel] = useState(telefono(usuario.telefono));
  const [estado, setEstado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const nuevo = tel.trim() ? normalizarTelefono(tel) : null;
  const error = tel.trim() && !nuevo ? 'Escribe un celular de 9 dígitos, por ejemplo 9 6123 4501' : '';

  const guardar = async (e) => {
    e.preventDefault();
    if (error) return;
    setEnviando(true);
    try {
      actualizarPerfil(await auth.actualizarTelefono(nuevo));
      setEstado({ ok: true, texto: nuevo ? 'Tu teléfono quedó actualizado.' : 'Quitaste tu teléfono.' });
    } catch (err) {
      setEstado({ ok: false, texto: err.campos?.telefono ?? err.message });
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Tarjeta titulo="Teléfono">
      <Box component="form" onSubmit={guardar} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <TextField
          label="Celular (opcional)" value={tel} onChange={(e) => { setTel(e.target.value); setEstado(null); }} placeholder="+56 9 6123 4501"
          error={!!error} helperText={error || 'Si lo dejas vacío, se quita de tu cuenta.'} sx={{ minWidth: 260, flex: 1 }}
          slotProps={{ htmlInput: { inputMode: 'tel', autoComplete: 'tel' } }}
        />
        <Button type="submit" variant="outlined" loading={enviando} disabled={nuevo === usuario.telefono} sx={{ mt: 1 }}>{tel.trim() ? 'Guardar teléfono' : 'Quitar teléfono'}</Button>
      </Box>
      {estado && <Alert severity={estado.ok ? 'success' : 'error'} variant="outlined">{estado.texto}</Alert>}
    </Tarjeta>
  );
}

// POST auth/perfil/correo (con la contraseña actual, para que nadie cambie el correo desde una sesión ajena)
// envía un código de 6 dígitos al correo nuevo; POST auth/perfil/correo/confirmacion lo confirma y devuelve el perfil.
// Mientras tanto, la cuenta sigue con el correo anterior.
function Correo() {
  const { usuario, actualizarPerfil } = useSesion();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [errorClave, setErrorClave] = useState('');
  const [pedido, setPedido] = useState(null);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const c = correo.trim().toLowerCase();

  const pedir = async (e) => {
    e.preventDefault();
    if (!correoValido(c)) { setError('El correo no es válido'); return; }
    if (!clave) { setErrorClave('Escribe tu contraseña actual'); return; }
    setEnviando(true);
    try {
      const r = await auth.pedirCambioCorreo(c, clave);
      setPedido({ correo: c, mensaje: r.mensaje, expiraEn: r.expiraEn });
      setCodigo('');
      setClave('');
      setError('');
      setErrorClave('');
      setListo(false);
    } catch (err) {
      if (err.campos?.passwordActual) setErrorClave(err.campos.passwordActual);
      else setError(err.campos?.correo ?? err.message);
    } finally {
      setEnviando(false);
    }
  };
  const confirmar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      actualizarPerfil(await auth.confirmarCambioCorreo(codigo));
      setPedido(null);
      setCorreo('');
      setCodigo('');
      setListo(true);
    } catch (err) {
      setError(err.campos?.codigo ?? err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Tarjeta titulo="Correo" extra="Aquí llegan los códigos para entrar y los avisos">
      <Typography>Tu correo es <b>{usuario.correo}</b>.</Typography>
      {listo && <Alert severity="success" variant="outlined">Tu correo quedó actualizado. Le avisamos también a tu correo anterior.</Alert>}
      {!pedido ? (
        <Box component="form" onSubmit={pedir} sx={{ display: 'grid', gap: 1.5, maxWidth: 520 }}>
          <TextField
            label="Correo nuevo" type="email" value={correo} onChange={(e) => { setCorreo(e.target.value); setError(''); }}
            error={!!error} helperText={error || ' '} slotProps={{ htmlInput: { maxLength: 100, autoComplete: 'email' } }}
          />
          <CampoClave
            label="Contraseña actual" value={clave} onChange={(e) => { setClave(e.target.value); setErrorClave(''); }}
            error={!!errorClave} helperText={errorClave || 'Para confirmar que eres tú.'} slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
          />
          <Box><Button type="submit" variant="outlined" loading={enviando} disabled={!correo.trim() || !clave}>Enviarme un código</Button></Box>
        </Box>
      ) : (
        <Box component="form" onSubmit={confirmar} sx={{ display: 'grid', gap: 1.5 }}>
          <Typography color="text.secondary">
            {pedido.mensaje} {pedido.expiraEn && `Vence a las ${fechaHora(pedido.expiraEn).split(' · ')[1]}.`} Mientras no lo escribas, tu cuenta sigue con el correo actual.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <TextField
              label="Código" value={codigo} onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              error={!!error} helperText={error || ' '} sx={{ width: 200 }}
              slotProps={{ htmlInput: { inputMode: 'numeric', autoComplete: 'one-time-code', style: { letterSpacing: '0.3em', fontWeight: 700 } } }}
            />
            <Button type="submit" variant="contained" loading={enviando} disabled={codigo.length !== 6} sx={{ mt: 1 }}>Confirmar correo</Button>
            <Button onClick={() => { setPedido(null); setError(''); }} sx={{ mt: 1 }}>Usar otro correo</Button>
          </Box>
        </Box>
      )}
    </Tarjeta>
  );
}

// PUT auth/perfil/password: devuelve una sesión nueva; el token anterior y los de otros equipos dejan de servir
function Contrasena() {
  const { renovarSesion } = useSesion();
  const [f, setF] = useState({ actual: '', nueva: '', repetir: '' });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState(null);
  const [listo, setListo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const errorNueva = errorClaveNueva(f.nueva);
  const errorRepetir = f.repetir !== f.nueva ? 'Las contraseñas no coinciden' : '';
  const cambiar = (e) => { setF({ ...f, [e.target.name]: e.target.value }); setError(null); setListo(false); };

  const guardar = async (e) => {
    e.preventDefault();
    setIntento(true);
    if (!f.actual || errorNueva || errorRepetir) return;
    setEnviando(true);
    try {
      renovarSesion(await auth.cambiarPassword(f.actual, f.nueva));
      setF({ actual: '', nueva: '', repetir: '' });
      setIntento(false);
      setListo(true);
    } catch (err) {
      setError(err.campos ?? { general: err.message });
    } finally {
      setEnviando(false);
    }
  };
  const ayuda = (campo, propio, normal = ' ') => error?.[campo] || (intento && propio) || normal;
  return (
    <Tarjeta titulo="Contraseña">
      <Box component="form" onSubmit={guardar} sx={{ display: 'grid', gap: 1.5, maxWidth: 420 }}>
        <CampoClave
          label="Contraseña actual" name="actual" value={f.actual} onChange={cambiar}
          error={!!error?.passwordActual || (intento && !f.actual)} helperText={ayuda('passwordActual', !f.actual && 'Escribe tu contraseña actual')}
          slotProps={{ htmlInput: { autoComplete: 'current-password' } }}
        />
        <CampoClave
          label="Contraseña nueva" name="nueva" value={f.nueva} onChange={cambiar}
          error={!!error?.passwordNueva || (intento && !!errorNueva)} helperText={ayuda('passwordNueva', errorNueva, 'Al menos 8 caracteres, con una letra y un número.')}
          slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
        />
        <CampoClave
          label="Repite la contraseña nueva" name="repetir" value={f.repetir} onChange={cambiar}
          error={intento && !!errorRepetir} helperText={(intento && errorRepetir) || ' '} slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
        />
        {error?.general && <Alert severity="error">{error.general}</Alert>}
        <Box><Button type="submit" variant="contained" loading={enviando} disabled={!f.actual || !f.nueva || !f.repetir}>Cambiar contraseña</Button></Box>
        <Typography variant="body2" color="text.secondary">Al cambiarla, cerramos tu sesión en los otros equipos donde entraste y te avisamos por correo.</Typography>
        {listo && <Alert severity="success" variant="outlined">Contraseña actualizada.</Alert>}
      </Box>
    </Tarjeta>
  );
}

// Mi cuenta (auth/perfil): teléfono, correo con código y contraseña. La usa cualquier persona del panel.
// El nombre y el RUT no se cambian aquí: los corrige la administración o el equipo de EntreCasas.
export default function MiCuenta() {
  const { usuario, comunidad } = useSesion();
  return (
    <Box sx={{ maxWidth: 760 }}>
      <Encabezado contexto={comunidad?.nombre ?? 'EntreCasas'} titulo="Mi cuenta" descripcion={`${nombreCompleto(usuario)} · RUT ${usuario.pais === 'CL' ? formatearRut(usuario.identificador) : usuario.identificador}`} />
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        <Telefono />
        <Correo />
        <Contrasena />
      </Box>
    </Box>
  );
}

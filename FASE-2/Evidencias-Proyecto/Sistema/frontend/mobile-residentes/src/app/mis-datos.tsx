import { useState } from 'react';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import * as auth from '@/api/auth';
import { ErrorApi, mensajeDe } from '@/api/cliente';
import { normalizarTelefono, telefono } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
// Mensaje del campo si la API lo marcó; si no, el mensaje general
const errorDe = (e: unknown, campo: string) => (e instanceof ErrorApi && e.campos?.[campo]) || mensajeDe(e);

// Teléfono y correo de la cuenta, como la API (auth/perfil/telefono y auth/perfil/correo):
// el teléfono se cambia o se quita al guardar; el correo nuevo se confirma con un código de 6 dígitos
// que llega a ese correo, y mientras tanto la cuenta sigue con el anterior.
// El nombre y el RUT no se cambian aquí: los corrige la administración.
export default function MisDatos() {
  const { perfil, acciones } = useSesion();
  const [tel, setTel] = useState(telefono(perfil?.telefono));
  const [errorTel, setErrorTel] = useState<string | null>(null);
  const [correo, setCorreo] = useState('');
  const [pedido, setPedido] = useState<{ correo: string; mensaje: string } | null>(null);
  const [codigo, setCodigo] = useState('');
  const [errorCorreo, setErrorCorreo] = useState<string | null>(null);
  // Contraseña actual: el backend la pide para cambiar el correo (que nadie lo cambie desde un teléfono ajeno)
  const [clave, setClave] = useState('');
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<'telefono' | 'correo' | null>(null);
  if (!perfil) return null;

  const nuevoTelefono = tel.trim() ? normalizarTelefono(tel) : null;
  const telInvalido = !!tel.trim() && !nuevoTelefono;
  const c = correo.trim().toLowerCase();

  const guardarTelefono = async () => {
    if (telInvalido) { setErrorTel('Escribe un celular de 9 dígitos, por ejemplo 9 6123 4501'); return; }
    setEnviando('telefono');
    try {
      acciones.actualizarPerfil(await auth.actualizarTelefono(nuevoTelefono));
      setErrorTel(null);
      acciones.avisar(nuevoTelefono ? 'Tu teléfono quedó actualizado.' : 'Quitaste tu teléfono.');
    } catch (e) {
      setErrorTel(errorDe(e, 'telefono'));
    } finally {
      setEnviando(null);
    }
  };
  const pedirCodigo = async () => {
    if (!correoValido(c)) { setErrorCorreo('Revisa el correo'); return; }
    if (!clave) { setErrorClave('Escribe tu contraseña actual'); return; }
    setEnviando('correo');
    try {
      const r = await auth.pedirCambioCorreo(c, clave);
      setPedido({ correo: c, mensaje: r.mensaje });
      setCodigo('');
      setClave('');
      setErrorCorreo(null);
      setErrorClave(null);
    } catch (e) {
      if (e instanceof ErrorApi && e.campos?.passwordActual) setErrorClave(e.campos.passwordActual);
      else setErrorCorreo(errorDe(e, 'correo'));
    } finally {
      setEnviando(null);
    }
  };
  const confirmar = async () => {
    setEnviando('correo');
    try {
      acciones.actualizarPerfil(await auth.confirmarCambioCorreo(codigo));
      acciones.avisar('Tu correo quedó actualizado. Le avisamos también a tu correo anterior.');
      router.back();
    } catch (e) {
      setErrorCorreo(errorDe(e, 'codigo'));
    } finally {
      setEnviando(null);
    }
  };

  return (
    <Hoja titulo="Mis datos de contacto">
      <Texto v="suave">La administración y la conserjería usan estos datos para avisarte. Al correo también llegan los códigos para entrar.</Texto>

      <Tarjeta>
        <Texto v="etiqueta">Teléfono</Texto>
        <Campo
          etiqueta="Teléfono celular (opcional)" value={tel} onChangeText={(v) => { setTel(v); setErrorTel(null); }} keyboardType="phone-pad" autoComplete="tel" placeholder="+56 9 6123 4501"
          error={errorTel ?? false} ayuda="Si lo dejas vacío, la conserjería no podrá llamarte y no podrás publicar en el mercado."
        />
        <Boton tipo="secundario" texto={tel.trim() ? 'Guardar teléfono' : 'Quitar teléfono'} cargando={enviando === 'telefono'} disabled={nuevoTelefono === perfil.telefono} onPress={guardarTelefono} />
      </Tarjeta>

      <Tarjeta>
        <Texto v="etiqueta">Correo</Texto>
        <Texto>Tu correo es <Texto v="fuerte">{perfil.correo}</Texto>.</Texto>
        {!pedido ? (
          <>
            <Campo
              etiqueta="Correo nuevo" value={correo} onChangeText={(v) => { setCorreo(v); setErrorCorreo(null); }} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
              maxLength={100} error={errorCorreo ?? false}
            />
            <Campo
              etiqueta="Contraseña actual" value={clave} onChangeText={(v) => { setClave(v); setErrorClave(null); }} secureTextEntry
              autoComplete="current-password" textContentType="password" error={errorClave ?? false} ayuda="Para confirmar que eres tú."
            />
            <Boton tipo="secundario" texto="Enviarme un código" cargando={enviando === 'correo'} disabled={!correo.trim() || !clave} onPress={pedirCodigo} />
          </>
        ) : (
          <>
            <Texto v="suave">{pedido.mensaje} Mientras no lo escribas, tu cuenta sigue con el correo actual.</Texto>
            <Campo
              etiqueta="Código" value={codigo} onChangeText={(v) => { setCodigo(v.replace(/\D/g, '')); setErrorCorreo(null); }}
              keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" error={errorCorreo ?? false}
            />
            <Boton texto="Confirmar correo" cargando={enviando === 'correo'} disabled={codigo.length !== 6} onPress={confirmar} />
            <Boton tipo="texto" texto="Usar otro correo" onPress={() => { setPedido(null); setCodigo(''); setErrorCorreo(null); }} />
          </>
        )}
      </Tarjeta>
    </Hoja>
  );
}

import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { normalizarTelefono, telefono } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);

// Teléfono y correo de la cuenta (`usuarios.telefono` y `usuarios.correo`), como la API:
// el teléfono se cambia o se quita al guardar; el correo nuevo se confirma con un código de 6 dígitos
// que llega a ese correo, y mientras tanto la cuenta sigue con el anterior.
// El nombre y el RUT no se cambian aquí: los corrige la administración.
export default function MisDatos() {
  const { cuenta, cambioCorreo, acciones } = useApp();
  const [tel, setTel] = useState(telefono(cuenta?.telefono));
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  // Código de prueba: con la API llega por correo; aquí se muestra para poder probar
  const [codigoPrueba, setCodigoPrueba] = useState<string | null>(null);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);
  const [intento, setIntento] = useState(false);
  if (!cuenta) return null;

  const nuevoTelefono = tel.trim() ? normalizarTelefono(tel) : null;
  const errorTelefono = !!tel.trim() && !nuevoTelefono && 'Escribe un celular de 9 dígitos, por ejemplo 9 6123 4501';
  const telefonoSinCambios = nuevoTelefono === cuenta.telefono;
  const c = correo.trim().toLowerCase();
  const errorCorreo = !correoValido(c) ? 'Revisa el correo' : c.length > 100 ? 'El correo no puede superar 100 caracteres' : false;

  const guardarTelefono = () => {
    setIntento(true);
    if (errorTelefono) return;
    acciones.actualizarTelefono(nuevoTelefono);
  };
  const pedirCodigo = () => {
    if (errorCorreo) { setIntento(true); return; }
    const r = acciones.pedirCambioCorreo(c);
    if (r.ok) { setCodigoPrueba(r.codigo); setCodigo(''); setErrorCodigo(null); }
  };
  const confirmar = () => {
    const error = acciones.confirmarCambioCorreo(codigo.replace(/\s/g, ''));
    setErrorCodigo(error);
    if (!error) { setCorreo(''); setCodigoPrueba(null); router.back(); }
  };

  return (
    <Hoja titulo="Mis datos de contacto">
      <Texto v="suave">La administración y la conserjería usan estos datos para avisarte. Al correo también llegan los códigos para entrar.</Texto>

      <Tarjeta>
        <Texto v="etiqueta">Teléfono</Texto>
        <Campo
          etiqueta="Teléfono celular (opcional)" value={tel} onChangeText={setTel} keyboardType="phone-pad" autoComplete="tel" placeholder="+56 9 6123 4501"
          error={intento && errorTelefono} ayuda="Si lo dejas vacío, la conserjería no podrá llamarte y no podrás publicar en el mercado."
        />
        <Boton tipo="secundario" texto={tel.trim() ? 'Guardar teléfono' : 'Quitar teléfono'} disabled={telefonoSinCambios} onPress={guardarTelefono} />
      </Tarjeta>

      <Tarjeta>
        <Texto v="etiqueta">Correo</Texto>
        <Texto>Tu correo es <Texto v="fuerte">{cuenta.correo}</Texto>.</Texto>
        {!cambioCorreo ? (
          <>
            <Campo
              etiqueta="Correo nuevo" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" autoComplete="email"
              maxLength={100} error={intento && !!correo && errorCorreo}
            />
            <Boton tipo="secundario" texto="Enviarme un código" disabled={!correo.trim()} onPress={pedirCodigo} />
          </>
        ) : (
          <>
            <Texto v="suave">Si {cambioCorreo.correo} está disponible, te enviamos un código de 6 dígitos. Vence en 10 minutos. Mientras no lo escribas, tu cuenta sigue con el correo actual.</Texto>
            {codigoPrueba
              ? <Texto v="chico">Código de prueba (con la API llega al correo): {codigoPrueba}</Texto>
              : <Texto v="chico">Prueba: ese correo ya lo usa otra cuenta, así que no se envió ningún código.</Texto>}
            <Campo
              etiqueta="Código" value={codigo} onChangeText={(v) => { setCodigo(v.replace(/\D/g, '')); setErrorCodigo(null); }}
              keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" error={errorCodigo ?? false}
            />
            <Boton texto="Confirmar correo" disabled={codigo.length !== 6} onPress={confirmar} />
            <Boton tipo="texto" texto="Usar otro correo" onPress={() => { setCodigoPrueba(null); setCodigo(''); setErrorCodigo(null); acciones.descartarCambioCorreo(); }} />
          </>
        )}
      </Tarjeta>
    </Hoja>
  );
}

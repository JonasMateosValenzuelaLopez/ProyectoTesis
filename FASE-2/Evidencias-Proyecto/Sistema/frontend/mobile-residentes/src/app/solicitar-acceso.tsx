import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { AVISO_SOLICITUD, TEXTO_CONSENTIMIENTO } from '@/constants/privacidad';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as comunidadApi from '@/api/comunidad';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import type { TipoResidencia } from '@/api/tipos';
import { formatearRut, rutValido } from '@/utils/rut';
import { normalizarTelefono } from '@/utils/formato';
import { useTema } from '@/constants/tema';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';

const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.trim());

// Un vecino nuevo pide acceso a su vivienda (POST solicitudes-acceso, sin cuenta todavía).
// La administración de la comunidad lo aprueba o rechaza en el panel y le avisa por correo.
export default function SolicitarAcceso() {
  const t = useTema();
  const comunidades = useConsulta(comunidadApi.comunidadesParaSolicitar);
  // Campos con los nombres del backend (CrearSolicitudAccesoDto)
  const [f, setF] = useState({ idRed: '', numeroUnidad: '', tipoResidencia: 'Propietario' as TipoResidencia, nombre: '', primerApellido: '', segundoApellido: '', identificador: '', correo: '', telefono: '', mensaje: '' });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviada, setEnviada] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Consentimiento obligatorio (Ley 21.719): se envía como `aceptaPrivacidad` y el backend guarda la fecha y la versión del aviso.
  const [acepta, setAcepta] = useState(false);
  const cambiar = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setError(null); };
  const comunidad = (comunidades.datos ?? []).find((c) => String(c.idRed) === f.idRed);
  const tel = f.telefono.trim() ? normalizarTelefono(f.telefono) : null;

  const faltas = {
    idRed: !f.idRed && 'Elige tu comunidad',
    numeroUnidad: !f.numeroUnidad.trim() && 'Escribe el número de tu vivienda',
    nombre: !f.nombre.trim() && 'Escribe tu nombre',
    primerApellido: !f.primerApellido.trim() && 'Escribe tu apellido',
    identificador: !rutValido(f.identificador) && 'RUT no válido',
    correo: !correoValido(f.correo) && 'Revisa el correo',
    telefono: !!f.telefono.trim() && !tel && 'Escribe un celular de 9 dígitos',
    acepta: !acepta && 'Para enviar la solicitud debes aceptar el tratamiento de tus datos',
  };
  const err = (k: keyof typeof faltas) => (intento ? faltas[k] : false);

  const enviar = async () => {
    setIntento(true);
    if (Object.values(faltas).some(Boolean)) return;
    setEnviando(true);
    try {
      const r = await comunidadApi.crearSolicitud({
        idRed: Number(f.idRed),
        identificador: formatearRut(f.identificador),
        nombre: f.nombre.trim(),
        primerApellido: f.primerApellido.trim(),
        ...(f.segundoApellido.trim() ? { segundoApellido: f.segundoApellido.trim() } : {}),
        correo: f.correo.trim().toLowerCase(),
        ...(tel ? { telefono: tel } : {}),
        numeroUnidad: f.numeroUnidad.trim(),
        tipoResidencia: f.tipoResidencia,
        ...(f.mensaje.trim() ? { mensaje: f.mensaje.trim() } : {}),
        aceptaPrivacidad: true,
      });
      setEnviada(r.mensaje);
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  if (enviada) {
    return (
      <Hoja titulo="Solicitud enviada" abajo={<Boton texto="Volver a entrar" onPress={() => router.back()} />}>
        <Ionicons name="paper-plane-outline" size={44} color={t.accion} />
        <Texto v="titulo">Listo, {f.nombre.trim().split(' ')[0]}</Texto>
        <Texto>{enviada}</Texto>
        <Texto v="suave">Pediste acceso a {comunidad?.tipo === 'Edificio' ? 'el depto' : 'la casa'} {f.numeroUnidad.trim()} de {comunidad?.nombre}. Te avisaremos a {f.correo.trim()}.</Texto>
      </Hoja>
    );
  }

  return (
    <Hoja titulo="Solicitar acceso" abajo={<Boton texto="Enviar solicitud" cargando={enviando} onPress={enviar} />}>
      <Texto v="suave">Pide acceso a tu vivienda. Tu comunidad debe estar en EntreCasas.</Texto>
      {comunidades.error ? (
        <View style={{ gap: 8 }}>
          <Texto color={t.bad}>{comunidades.error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={comunidades.recargar} />
        </View>
      ) : !comunidades.datos ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando comunidades" /> : (
        <Opciones etiqueta="Comunidad" opciones={comunidades.datos.map((c) => ({ valor: String(c.idRed), texto: c.nombre, detalle: c.tipo }))} valor={f.idRed || null} onCambio={cambiar('idRed')} />
      )}
      {err('idRed') && <Texto v="chico" color={t.bad}>{err('idRed')}</Texto>}
      <Campo etiqueta={comunidad?.tipo === 'Edificio' ? 'Número de depto' : 'Número de casa'} value={f.numeroUnidad} onChangeText={cambiar('numeroUnidad')} maxLength={20} error={err('numeroUnidad')} />
      <Opciones etiqueta="Vivo ahí como" opciones={[{ valor: 'Propietario', texto: 'Propietario' }, { valor: 'Arrendatario', texto: 'Arrendatario' }]} valor={f.tipoResidencia} onCambio={(v) => setF({ ...f, tipoResidencia: v as TipoResidencia })} />
      <Campo etiqueta="Nombre" value={f.nombre} onChangeText={cambiar('nombre')} autoComplete="name-given" maxLength={50} error={err('nombre')} />
      <Campo etiqueta="Primer apellido" value={f.primerApellido} onChangeText={cambiar('primerApellido')} autoComplete="name-family" maxLength={50} error={err('primerApellido')} />
      <Campo etiqueta="Segundo apellido (opcional)" value={f.segundoApellido} onChangeText={cambiar('segundoApellido')} maxLength={50} />
      <Campo etiqueta="RUT" value={f.identificador} onChangeText={cambiar('identificador')} onBlur={() => rutValido(f.identificador) && setF({ ...f, identificador: formatearRut(f.identificador) })} autoCapitalize="characters" error={err('identificador') || (f.identificador.length > 3 && !rutValido(f.identificador) && 'RUT no válido')} />
      <Campo etiqueta="Correo" value={f.correo} onChangeText={cambiar('correo')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={100} error={err('correo')} ayuda="Aquí te avisamos cuando te aprueben" />
      <Campo etiqueta="Teléfono (opcional)" value={f.telefono} onChangeText={cambiar('telefono')} keyboardType="phone-pad" autoComplete="tel" placeholder="+56 9 6123 4501" error={err('telefono')} />
      <Campo etiqueta="Mensaje para la administración (opcional)" value={f.mensaje} onChangeText={cambiar('mensaje')} multiline maxLength={255} style={{ minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }} />
      <View style={{ gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: err('acepta') ? t.bad : t.line, backgroundColor: t.paper }}>
        <Texto v="chico">
          {AVISO_SOLICITUD}{' '}
          <Texto v="chico" color={t.accion} onPress={() => router.push('/privacidad')} accessibilityRole="link">Lee la Política de privacidad</Texto>.
        </Texto>
        <Pressable
          onPress={() => { setAcepta(!acepta); setError(null); }}
          accessibilityRole="checkbox" accessibilityState={{ checked: acepta }} accessibilityLabel={TEXTO_CONSENTIMIENTO}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, minHeight: 44 }}
        >
          <Ionicons name={acepta ? 'checkbox' : 'square-outline'} size={24} color={acepta ? t.accion : t.ink2} />
          <Texto style={{ flex: 1 }}>{TEXTO_CONSENTIMIENTO}</Texto>
        </Pressable>
        {err('acepta') && <Texto v="chico" color={t.bad}>{err('acepta')}</Texto>}
      </View>
      {error && <Texto color={t.bad}>{error}</Texto>}
    </Hoja>
  );
}

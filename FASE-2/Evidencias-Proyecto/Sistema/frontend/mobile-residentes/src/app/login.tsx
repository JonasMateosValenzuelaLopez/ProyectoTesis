import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tieneVivienda, useSesion, viviendasDe } from '@/context/Sesion';
import * as auth from '@/api/auth';
import { mensajeDe } from '@/api/cliente';
import type { Sesion } from '@/api/tipos';
import { formatearRut, rutValido } from '@/utils/rut';
import { F, useTema } from '@/constants/tema';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import Pantalla from '@/components/ec/Pantalla';
import PasoSesion from '@/components/ec/PasoSesion';

const ENCENDIDAS = new Set([2, 5, 9, 14, 20, 23]);

function Marca() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.sidebar, marginHorizontal: -16, marginTop: -(insets.top + 12), paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 24, gap: 18, overflow: 'hidden' }}>
      {/* La misma foto del login del panel (torre, condominio y casas), teñida con el color de la marca */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
        <Image source={require('../../assets/images/login-comunidad.jpg')} contentFit="cover" contentPosition="center" style={{ flex: 1 }} />
        <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.sidebar, opacity: t.oscuro ? 0.84 : 0.78 }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <PlacaUnidad tipo="" numero="EC" size="sm" invertida />
        <Texto style={{ fontFamily: F.cifra, fontSize: 20, color: t.sidebarStrong }}>EntreCasas</Texto>
      </View>
      <Texto style={{ fontFamily: F.cifra, fontSize: 32, lineHeight: 34, color: t.sidebarStrong }}>Tu comunidad,{'\n'}casa por casa.</Texto>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <View key={i} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: ENCENDIDAS.has(i) ? t.placaSidebar : t.sidebarDot, backgroundColor: ENCENDIDAS.has(i) ? t.placaSidebar : 'transparent' }} />
        ))}
      </View>
    </View>
  );
}

// Entrada con RUT y clave, o con un código de un solo uso que llega al correo (auth/codigo).
// La app es para quienes viven en la comunidad: una cuenta sin vivienda va al panel web.
export default function Login() {
  const t = useTema();
  const { motivoSalida, acciones } = useSesion();
  const [rut, setRut] = useState('');
  const [metodo, setMetodo] = useState<'clave' | 'codigo'>('clave');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoPedido, setCodigoPedido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Respuesta del login mientras se muestra el saludo con la placa de la vivienda
  const [bienvenida, setBienvenida] = useState<Sesion | null>(null);

  const rutMal = rut.length > 3 && !rutValido(rut);

  const recibir = (s: Sesion) => {
    if (!tieneVivienda(s.usuario)) { setError('panel'); return; }
    setBienvenida(s);
  };

  const entrar = async () => {
    setError(null);
    if (!rutValido(rut)) { setError('Revisa el RUT: el dígito verificador no calza.'); return; }
    const identificador = formatearRut(rut);
    setEnviando(true);
    try {
      if (metodo === 'clave') recibir(await auth.login(identificador, clave));
      else if (!codigoPedido) setCodigoPedido((await auth.pedirCodigo(identificador)).mensaje);
      else recibir(await auth.verificarCodigo(identificador, codigo));
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  const abrirSesion = useCallback(async () => {
    if (!bienvenida) return;
    await acciones.iniciarSesion(bienvenida);
    router.replace('/(tabs)');
  }, [acciones, bienvenida]);
  const primera = bienvenida ? viviendasDe(bienvenida.usuario)[0]?.unidad : null;

  return (
    <Pantalla>
      <Marca />
      <View style={{ gap: 4, marginTop: 4 }}>
        <Texto v="titulo" accessibilityRole="header">Entrar</Texto>
        <Texto v="suave">Para residentes, propietarios y arrendatarios.</Texto>
      </View>
      {motivoSalida && (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: t.warnSoft, borderRadius: 12, padding: 12 }}>
          <Texto color={t.warn}>{motivoSalida}</Texto>
        </View>
      )}
      <Campo
        etiqueta="RUT" value={rut} placeholder="12.345.678-5" autoCapitalize="characters" autoComplete="username" textContentType="username"
        onChangeText={(v) => { setRut(v); setCodigoPedido(null); }} onBlur={() => rutValido(rut) && setRut(formatearRut(rut))}
        error={rutMal && 'RUT no válido'}
      />
      <Segmentos
        opciones={[{ valor: 'clave', texto: 'Con clave' }, { valor: 'codigo', texto: 'Con código' }]}
        valor={metodo} onCambio={(v) => { setMetodo(v); setError(null); setCodigoPedido(null); }}
      />
      {metodo === 'clave' && <Campo etiqueta="Clave" value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={entrar} />}
      {metodo === 'codigo' && codigoPedido && (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: t.accionSoft, borderRadius: 12, padding: 12 }}>
            <Texto>{codigoPedido} Vence en 10 minutos.</Texto>
          </View>
          <Campo
            etiqueta="Código" value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad"
            autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus style={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
          />
        </View>
      )}
      {error === 'panel' && (
        <View style={{ backgroundColor: t.accionSoft, borderRadius: 12, padding: 12 }}>
          <Texto>Tu cuenta es de la directiva, la administración o la conserjería, sin vivienda registrada. Entra al panel web desde un computador.</Texto>
        </View>
      )}
      {error && error !== 'panel' && (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: t.badSoft, borderRadius: 12, padding: 12 }}>
          <Texto color={t.bad}>{error}</Texto>
        </View>
      )}
      <Boton
        texto={metodo === 'codigo' && !codigoPedido ? 'Enviarme un código' : 'Entrar'} onPress={entrar} cargando={enviando}
        disabled={!rut.trim() || (metodo === 'clave' && !clave) || (metodo === 'codigo' && !!codigoPedido && codigo.length !== 6)}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Boton tipo="texto" texto="¿Olvidaste tu clave?" onPress={() => { setMetodo('codigo'); setError(null); setCodigoPedido(null); }} style={{ paddingHorizontal: 0 }} />
        <Boton tipo="texto" texto="Solicitar acceso" onPress={() => router.push('/solicitar-acceso')} style={{ paddingHorizontal: 0 }} />
      </View>
      {bienvenida && primera && (
        <PasoSesion tipo="entrar" nombre={bienvenida.usuario.nombre} placa={{ tipo: primera.tipoUnidad, numero: primera.numeroIdentificador }} alTerminar={abrirSesion} />
      )}
    </Pantalla>
  );
}

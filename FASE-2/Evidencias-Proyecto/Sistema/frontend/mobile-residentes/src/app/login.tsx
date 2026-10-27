import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/App';
import { CLAVE_PRUEBA, CODIGO_PRUEBA, CUENTAS, SOLO_PANEL, UNIDADES, type Cuenta } from '@/data/demo';
import { formatearRut, rutValido } from '@/utils/rut';
import { F, useTema } from '@/constants/tema';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import Pantalla from '@/components/ec/Pantalla';

// En la versión publicada se oculta con EXPO_PUBLIC_MODO_PRUEBA=false
const MODO_PRUEBA = process.env.EXPO_PUBLIC_MODO_PRUEBA !== 'false';
const ENCENDIDAS = new Set([2, 5, 9, 14, 20, 23]);

const ocultarCorreo = (correo: string) => correo.replace(/^(.)[^@]*/, (_, a) => `${a}•••`);

function Marca() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: t.sidebar, marginHorizontal: -16, marginTop: -(insets.top + 12), paddingTop: insets.top + 20, paddingHorizontal: 20, paddingBottom: 24, gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <PlacaUnidad tipo="" numero="EC" size="sm" invertida />
        <Texto style={{ fontFamily: F.cifra, fontSize: 20, color: '#fff' }}>EntreCasas</Texto>
      </View>
      <Texto style={{ fontFamily: F.cifra, fontSize: 32, lineHeight: 34, color: '#fff' }}>Tu comunidad,{'\n'}casa por casa.</Texto>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {Array.from({ length: 24 }, (_, i) => (
          <View key={i} style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: ENCENDIDAS.has(i) ? t.cobalt : 'rgba(201,209,218,0.25)', backgroundColor: ENCENDIDAS.has(i) ? t.cobalt : 'transparent' }} />
        ))}
      </View>
    </View>
  );
}

function CuentasPrueba({ onElegir }: { onElegir: (c: Cuenta) => void }) {
  const t = useTema();
  return (
    <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ padding: 14, gap: 2 }}>
        <Texto v="fuerte">Cuentas de prueba</Texto>
        <Texto v="chico">Clave para todas: {CLAVE_PRUEBA} · código: {CODIGO_PRUEBA}</Texto>
      </View>
      {CUENTAS.map((c) => {
        const u = UNIDADES[c.residencias[0].idUnidad];
        return (
          <Pressable key={c.id} onPress={() => onElegir(c)} accessibilityRole="button" accessibilityLabel={`Usar la cuenta de ${c.nombre} ${c.apellido}`}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderColor: t.line, backgroundColor: pressed ? t.cobaltSoft : t.surface })}>
            <PlacaUnidad tipo="" numero={u.numero} size="sm" />
            <View style={{ flex: 1 }}>
              <Texto v="fuerte">{c.nombre} {c.apellido}</Texto>
              <Texto v="chico">{c.flujo}</Texto>
            </View>
            <Texto v="chico" style={{ fontVariant: ['tabular-nums'] }}>{c.rut}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

// Entrada con RUT y clave, o con un código de un solo uso que llega al correo.
export default function Login() {
  const t = useTema();
  const { acciones } = useApp();
  const [rut, setRut] = useState('');
  const [metodo, setMetodo] = useState<'clave' | 'codigo'>('clave');
  const [clave, setClave] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rutMal = rut.length > 3 && !rutValido(rut);

  const entrar = () => {
    setError(null);
    if (!rutValido(rut)) return setError('Revisa el RUT: el dígito verificador no calza.');
    const r = formatearRut(rut);
    const c = CUENTAS.find((x) => x.rut === r);
    if (metodo === 'codigo' && !enviadoA) {
      // No se revela si el RUT existe: siempre se responde que se envió el código
      setEnviadoA(c ? ocultarCorreo(c.correo) : 'tu correo registrado');
      return;
    }
    const ok = metodo === 'clave' ? clave === CLAVE_PRUEBA : codigo === CODIGO_PRUEBA;
    if (ok && !c && SOLO_PANEL.includes(r)) return setError('panel');
    if (!ok || !c) return setError(metodo === 'clave' ? 'RUT o clave incorrectos.' : 'El código no es válido o ya venció.');
    acciones.iniciarSesion(c);
    router.replace('/(tabs)');
  };

  const elegir = (c: Cuenta) => {
    setRut(c.rut);
    setMetodo('clave');
    setClave(CLAVE_PRUEBA);
    setEnviadoA(null);
    setError(null);
  };

  return (
    <Pantalla>
      <Marca />
      <View style={{ gap: 4, marginTop: 4 }}>
        <Texto v="titulo" accessibilityRole="header">Entrar</Texto>
        <Texto v="suave">Para residentes, propietarios y arrendatarios.</Texto>
      </View>
      <Campo
        etiqueta="RUT" value={rut} placeholder="12.345.678-5" autoCapitalize="characters" autoComplete="username" textContentType="username"
        onChangeText={(v) => { setRut(v); setEnviadoA(null); }} onBlur={() => rutValido(rut) && setRut(formatearRut(rut))}
        error={rutMal && 'RUT no válido'}
      />
      <Segmentos
        opciones={[{ valor: 'clave', texto: 'Con clave' }, { valor: 'codigo', texto: 'Con código' }]}
        valor={metodo} onCambio={(v) => { setMetodo(v); setError(null); setEnviadoA(null); }}
      />
      {metodo === 'clave' && <Campo etiqueta="Clave" value={clave} onChangeText={setClave} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={entrar} />}
      {metodo === 'codigo' && enviadoA && (
        <View style={{ gap: 12 }}>
          <View style={{ backgroundColor: t.cobaltSoft, borderRadius: 12, padding: 12 }}>
            <Texto>Enviamos un código de 6 dígitos a {enviadoA}. Vence en 10 minutos.</Texto>
          </View>
          <Campo
            etiqueta="Código" value={codigo} onChangeText={(v) => setCodigo(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad"
            autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus style={{ letterSpacing: 6, fontVariant: ['tabular-nums'] }}
          />
        </View>
      )}
      {error === 'panel' && (
        <View style={{ backgroundColor: t.cobaltSoft, borderRadius: 12, padding: 12 }}>
          <Texto>Tu cuenta es de la directiva, la administración o la conserjería, sin vivienda registrada. Entra al panel web desde un computador.</Texto>
        </View>
      )}
      {error && error !== 'panel' && (
        <View accessibilityLiveRegion="polite" style={{ backgroundColor: t.badSoft, borderRadius: 12, padding: 12 }}>
          <Texto color={t.bad}>{error}</Texto>
        </View>
      )}
      <Boton texto={metodo === 'codigo' && !enviadoA ? 'Enviarme un código' : 'Entrar'} onPress={entrar} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Boton tipo="texto" texto="¿Olvidaste tu clave?" onPress={() => { setMetodo('codigo'); setError(null); }} style={{ paddingHorizontal: 0 }} />
        <Boton tipo="texto" texto="Solicitar acceso" onPress={() => router.push('/solicitar-acceso')} style={{ paddingHorizontal: 0 }} />
      </View>
      {MODO_PRUEBA && <CuentasPrueba onElegir={elegir} />}
    </Pantalla>
  );
}

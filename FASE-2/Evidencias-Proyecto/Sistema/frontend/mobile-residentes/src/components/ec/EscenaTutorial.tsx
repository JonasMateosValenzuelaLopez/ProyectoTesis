import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  Easing, cancelAnimation, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { F, sombra, useTema } from '@/constants/tema';
import Texto from './Texto';
import Chip from './Chip';

// Escenas animadas del tutorial: una pantalla en miniatura que muestra la función en uso
// (un dedo toca, el estado cambia), en un ciclo de unos 5 segundos que se repite.
// Todo cuelga de un solo valor `p` que va de 0 a 1. Con movimiento reducido `p` queda fijo en
// FINAL y se ve el estado terminado, sin movimiento. Son decorativas: el texto del paso dice lo mismo.

const DURACION = 5600;
const FINAL = 0.9;
const Ciclo = createContext<SharedValue<number> | null>(null);
const useP = () => useContext(Ciclo)!;

type Como = 'sube' | 'sello' | 'aparece';

// Aparece en `en` (fracción del ciclo) y, si hay `sale`, se va en `sale`. en < 0 = visible desde el inicio.
function Entra({ en, sale, como = 'sube', style, children }: { en: number; sale?: number; como?: Como; style?: ViewStyle; children: ReactNode }) {
  const p = useP();
  const st = useAnimatedStyle(() => {
    const a = interpolate(p.value, [en, en + 0.06], [0, 1], 'clamp');
    const b = sale == null ? 1 : interpolate(p.value, [sale, sale + 0.04], [1, 0], 'clamp');
    const transform = como === 'sube' ? [{ translateY: (1 - a) * 12 }] : como === 'sello' ? [{ scale: 1.7 - 0.7 * a }, { rotate: `${(1 - a) * -12}deg` }] : [];
    return { opacity: a * b, transform };
  });
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

// Varios estados en el mismo lugar, uno después del otro (Por pagar → En revisión → Pagado)
function Estados({ cambios, children, style }: { cambios: number[]; children: ReactNode[]; style?: ViewStyle }) {
  return (
    <View style={style}>
      {children.map((c, i) => (
        <Entra key={i} en={i === 0 ? -1 : cambios[i - 1]} sale={cambios[i]} como="aparece" style={i === 0 ? undefined : { position: 'absolute', left: 0, right: 0, top: 0 }}>
          {c}
        </Entra>
      ))}
    </View>
  );
}

// El dedo: un círculo que baja, se aprieta y se va. Va dentro de lo que se toca (que debe tener position relative).
function Toque({ en }: { en: number }) {
  const p = useP();
  const t = useTema();
  const st = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [en - 0.06, en - 0.02, en + 0.03, en + 0.07], [0, 0.55, 0.55, 0], 'clamp'),
    transform: [{ scale: interpolate(p.value, [en - 0.06, en, en + 0.07], [1.5, 0.85, 1.25], 'clamp') }],
  }));
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.ink, borderWidth: 3, borderColor: t.surface }, st]} />
    </View>
  );
}

// Barra que se llena entre `desde` y `hasta`
function Barra({ desde, hasta, pct, color }: { desde: number; hasta: number; pct: number; color: string }) {
  const p = useP();
  const t = useTema();
  const st = useAnimatedStyle(() => ({ width: `${interpolate(p.value, [desde, hasta], [0, pct], 'clamp')}%` }));
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden', flex: 1 }}>
      <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: color }, st]} />
    </View>
  );
}

function Mini({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTema();
  return <View style={[{ backgroundColor: t.surface, borderRadius: 14, padding: 12, gap: 6, borderWidth: t.oscuro ? 1 : 0, borderColor: t.line }, sombra(t), style]}>{children}</View>;
}

function BotonMini({ texto, en, icono }: { texto: string; en: number; icono?: keyof typeof Ionicons.glyphMap }) {
  const t = useTema();
  return (
    <View style={{ position: 'relative', backgroundColor: t.boton, borderRadius: 12, minHeight: 38, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {icono && <Ionicons name={icono} size={16} color={t.botonInk} />}
      <Texto style={{ fontFamily: F.negrita, fontSize: 14, color: t.botonInk }}>{texto}</Texto>
      <Toque en={en} />
    </View>
  );
}

const Chico = ({ children, color }: { children: ReactNode; color?: string }) => <Texto v="chico" color={color}>{children}</Texto>;
const Fuerte = ({ children, color }: { children: ReactNode; color?: string }) => <Texto style={{ fontFamily: F.negrita, fontSize: 15, lineHeight: 20 }} color={color}>{children}</Texto>;
const Cifra = ({ children }: { children: ReactNode }) => <Texto style={{ fontFamily: F.cifra, fontSize: 26, lineHeight: 30, letterSpacing: -0.6, fontVariant: ['tabular-nums'] }}>{children}</Texto>;

// ---------- Escenas ----------

function Inicio({ cobros, votaciones }: Opciones) {
  const t = useTema();
  return (
    <>
      {cobros && (
        <Entra en={0.04}>
          <Mini>
            <Texto v="etiqueta">Gasto común · noviembre</Texto>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Cifra>$58.400</Cifra>
              <Chip texto="Vence el 10" tono="warn" />
            </View>
          </Mini>
        </Entra>
      )}
      <Entra en={0.3}>
        <Mini style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: t.accionSoft }}>
          <Ionicons name="trash-outline" size={22} color={t.accion} />
          <View style={{ flex: 1 }}>
            <Fuerte>Hoy pasa el camión</Fuerte>
            <Chico>Saca la basura desde las 20:00</Chico>
          </View>
        </Mini>
      </Entra>
      {votaciones && (
        <Entra en={0.55}>
          <Mini style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkbox-outline" size={22} color={t.patina} />
            <Fuerte>1 votación espera tu voto</Fuerte>
          </Mini>
        </Entra>
      )}
    </>
  );
}

function Finanzas() {
  const t = useTema();
  return (
    <Mini style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View>
          <Texto v="etiqueta">Noviembre</Texto>
          <Cifra>$58.400</Cifra>
        </View>
        <Estados cambios={[0.36, 0.66]} style={{ minWidth: 104, alignItems: 'flex-end' }}>
          <Chip texto="Por pagar" tono="warn" />
          <View style={{ alignItems: 'flex-end' }}><Chip texto="En revisión" tono="accion" /></View>
          <View style={{ alignItems: 'flex-end' }}><Chip texto="Pagado" tono="ok" /></View>
        </Estados>
      </View>
      <Estados cambios={[0.36]}>
        <BotonMini texto="Avisar que transferí" icono="paper-plane-outline" en={0.28} />
        <View style={{ minHeight: 38, justifyContent: 'center' }}><Chico>Aviso enviado. La administración lo revisa.</Chico></View>
      </Estados>
      <Entra en={0.68}>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Ionicons name="checkmark-circle" size={18} color={t.ok} />
          <Chico color={t.ok}>Tesorería validó tu pago</Chico>
        </View>
      </Entra>
    </Mini>
  );
}

function Muro({ muro, votaciones }: Opciones) {
  const t = useTema();
  return (
    <>
      {muro && (
        <Mini>
          <Texto v="etiqueta" color={t.patina}>Comunicado</Texto>
          <Fuerte>Corte de agua el jueves</Fuerte>
          <Chico>De 9:00 a 13:00 por limpieza del estanque.</Chico>
          <Entra en={0.14} como="sello" style={{ position: 'absolute', right: 10, top: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: t.patina, alignItems: 'center', justifyContent: 'center', backgroundColor: t.patinaSoft }}>
              <Texto style={{ fontFamily: F.cifra, fontSize: 18, color: t.patina }}>P</Texto>
            </View>
          </Entra>
          <Entra en={0.2} como="aparece"><Chico color={t.patina}>Aprobado por Presidencia</Chico></Entra>
        </Mini>
      )}
      {votaciones && (
        <Entra en={muro ? 0.36 : 0.04}>
          <Mini style={{ gap: 8 }}>
            <Fuerte>¿Pintamos la fachada en marzo?</Fuerte>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ position: 'relative', width: 44 }}><Chico>Sí</Chico><Toque en={0.5} /></View>
              <Barra desde={0.54} hasta={0.74} pct={64} color={t.boton} />
              <Texto style={{ fontFamily: F.negrita, fontSize: 13, width: 36, textAlign: 'right', color: t.ink }}>64%</Texto>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={{ width: 44 }}><Chico>No</Chico></View>
              <Barra desde={0.54} hasta={0.74} pct={36} color={t.lineStrong} />
              <Texto style={{ fontFamily: F.negrita, fontSize: 13, width: 36, textAlign: 'right', color: t.ink }}>36%</Texto>
            </View>
            <Entra en={0.6} como="aparece"><Chip texto="Tu vivienda votó Sí" tono="ok" /></Entra>
          </Mini>
        </Entra>
      )}
    </>
  );
}

function Reservas({ espacio, bloques }: Opciones) {
  const t = useTema();
  const dias = [['Lun', '3'], ['Mar', '4'], ['Mié', '5'], ['Jue', '6'], ['Vie', '7']];
  const horas = (bloques ?? []).slice(0, 2);
  return (
    <Mini style={{ gap: 10 }}>
      <Fuerte>{espacio}</Fuerte>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {dias.map(([d, n], i) => (
          <View key={d} style={{ flex: 1, position: 'relative', borderRadius: 10, borderWidth: 1, borderColor: t.line, paddingVertical: 6, alignItems: 'center' }}>
            {i === 4 && (
              <Entra en={0.2} como="aparece" style={{ position: 'absolute', top: -1, bottom: -1, left: -1, right: -1, borderRadius: 10, backgroundColor: t.ink }}><View /></Entra>
            )}
            <Estados cambios={i === 4 ? [0.2] : []} style={{ alignItems: 'center' }}>
              {[<Texto key="a" style={{ fontSize: 11, color: t.ink2, fontFamily: F.etiqueta }}>{d}</Texto>, ...(i === 4 ? [<Texto key="b" style={{ fontSize: 11, color: t.paper, fontFamily: F.etiqueta, textAlign: 'center' }}>{d}</Texto>] : [])]}
            </Estados>
            <Estados cambios={i === 4 ? [0.2] : []} style={{ alignItems: 'center' }}>
              {[<Texto key="a" style={{ fontFamily: F.cifra, fontSize: 16, color: t.ink }}>{n}</Texto>, ...(i === 4 ? [<Texto key="b" style={{ fontFamily: F.cifra, fontSize: 16, color: t.paper, textAlign: 'center' }}>{n}</Texto>] : [])]}
            </Estados>
            {i === 4 && <Toque en={0.16} />}
          </View>
        ))}
      </View>
      {horas.map((h, i) => (
        <Entra key={h} en={0.28 + i * 0.06}>
          <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1, borderColor: t.line, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Texto style={{ fontFamily: F.negrita, fontSize: 14, color: t.ink, fontVariant: ['tabular-nums'] }}>{h}</Texto>
            <Estados cambios={i === 0 ? [0.58] : []} style={{ minWidth: 104, alignItems: 'flex-end' }}>
              {[<Chip key="a" texto="Libre" tono="neutro" />, ...(i === 0 ? [<View key="b" style={{ alignItems: 'flex-end' }}><Chip texto="Reservado" tono="ok" /></View>] : [])]}
            </Estados>
            {i === 0 && <Toque en={0.52} />}
          </View>
        </Entra>
      ))}
    </Mini>
  );
}

function Mercado() {
  const t = useTema();
  return (
    <Mini style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: t.accionSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="bicycle" size={30} color={t.accion} />
        </View>
        <View style={{ flex: 1 }}>
          <Fuerte>Bicicleta aro 26</Fuerte>
          <Texto style={{ fontFamily: F.cifra, fontSize: 18, color: t.ink }}>$45.000</Texto>
          <Chico>Vende un vecino de la comunidad</Chico>
        </View>
      </View>
      <Estados cambios={[0.32, 0.6]}>
        <BotonMini texto="Pedir teléfono" icono="call-outline" en={0.24} />
        <View style={{ minHeight: 38, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="time-outline" size={18} color={t.warn} />
          <Chico>Esperando que el vecino acepte…</Chico>
        </View>
        <View style={{ minHeight: 38, flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: t.okSoft, borderRadius: 12, paddingHorizontal: 12 }}>
          <Ionicons name="call" size={18} color={t.ok} />
          <Texto style={{ fontFamily: F.negrita, fontSize: 15, color: t.ok, fontVariant: ['tabular-nums'] }}>+56 9 6123 4501</Texto>
        </View>
      </Estados>
      <Entra en={0.62} como="aparece"><Chico>Aceptó compartir su número contigo.</Chico></Entra>
    </Mini>
  );
}

// Patrón fijo de un QR de juguete (7 × 7)
const QR = ['1110111', '1010101', '1110011', '0001100', '1101011', '1000110', '1110101'];

function Visitas({ conserjeria }: Opciones) {
  const t = useTema();
  const p = useP();
  const tapa = useAnimatedStyle(() => ({ height: `${interpolate(p.value, [0.06, 0.3], [100, 0], 'clamp')}%` }));
  const linea = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0.4, 0.43, 0.6, 0.63], [0, 1, 1, 0], 'clamp'),
    top: `${interpolate(p.value, [0.42, 0.61], [0, 96], 'clamp')}%`,
  }));
  return (
    <Mini style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <View style={{ width: 98, height: 98, padding: 7, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
        {QR.map((fila, y) => (
          <View key={y} style={{ flexDirection: 'row', flex: 1 }}>
            {fila.split('').map((c, x) => <View key={x} style={{ flex: 1, backgroundColor: c === '1' ? '#16333D' : 'transparent', borderRadius: 1.5, margin: 0.5 }} />)}
          </View>
        ))}
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF' }, tapa]} />
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: t.signal, boxShadow: `0 0 8px ${t.signal}` }, linea]} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <Fuerte>Visita de Camila</Fuerte>
        <Chico>Sábado, 15:00 a 22:00</Chico>
        <Chip texto="EC-4K7P-2QHM" tono="senal" codigo />
        <Estados cambios={[0.64]}>
          <Chico>{conserjeria ? 'Conserjería la escanea al llegar' : 'Se valida en la entrada'}</Chico>
          <Chip texto="Camila llegó" tono="ok" />
        </Estados>
      </View>
    </Mini>
  );
}

function Perfil() {
  const t = useTema();
  const filas: { icono: keyof typeof Ionicons.glyphMap; titulo: string; detalle: string; chip?: string }[] = [
    { icono: 'color-palette-outline', titulo: 'Pintura del living', detalle: 'SW 7036, látex mate' },
    { icono: 'construct-outline', titulo: 'Calefont', detalle: 'Mantención anual', chip: 'En 12 días' },
    { icono: 'document-text-outline', titulo: 'Lista del supermercado', detalle: 'Leche, Pan, Detergente y 1 más' },
  ];
  return (
    <>
      <Mini style={{ gap: 2, paddingVertical: 6 }}>
        <Texto v="etiqueta" style={{ paddingTop: 6 }}>Mi hogar</Texto>
        {filas.map((f, i) => (
          <Entra key={f.titulo} en={0.06 + i * 0.12}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: t.line }}>
              <Ionicons name={f.icono} size={20} color={t.accion} />
              <View style={{ flex: 1 }}>
                <Fuerte>{f.titulo}</Fuerte>
                <Chico>{f.detalle}</Chico>
              </View>
              {f.chip && <Chip texto={f.chip} tono="warn" />}
            </View>
          </Entra>
        ))}
      </Mini>
      <Entra en={0.56}>
        <View style={{ backgroundColor: t.ink, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Ionicons name="notifications" size={18} color={t.paper} />
          <Texto style={{ flex: 1, color: t.paper, fontSize: 14 }}>Te avisamos en Inicio antes de la mantención.</Texto>
        </View>
      </Entra>
    </>
  );
}

// ---------- Marco ----------

export type ClaveEscena = 'inicio' | 'finanzas' | 'muro' | 'reservas' | 'mercado' | 'visitas' | 'perfil';
type Opciones = { cobros?: boolean; votaciones?: boolean; muro?: boolean; conserjeria?: boolean; espacio?: string; bloques?: string[] };
const ESCENAS: Record<ClaveEscena, (o: Opciones) => ReactNode> = { inicio: Inicio, finanzas: Finanzas, muro: Muro, reservas: Reservas, mercado: Mercado, visitas: Visitas, perfil: Perfil };

export default function EscenaTutorial({ clave, opciones = {} }: { clave: ClaveEscena; opciones?: Opciones }) {
  const t = useTema();
  const reducido = useReducedMotion();
  const p = useSharedValue(reducido ? FINAL : 0);
  useEffect(() => {
    if (reducido) { p.value = FINAL; return; }
    p.value = 0;
    p.value = withRepeat(withTiming(1, { duration: DURACION, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(p);
  }, [reducido, p, clave]);
  // Al final del ciclo todo se desvanece y vuelve a empezar
  const ciclo = useAnimatedStyle(() => ({ opacity: interpolate(p.value, [0, 0.03, 0.94, 1], [0, 1, 1, 0], 'clamp') }));
  const Escena = ESCENAS[clave];
  return (
    <Ciclo.Provider value={p}>
      <View
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ backgroundColor: t.paper, borderRadius: 24, borderWidth: 1, borderColor: t.line, padding: 14, minHeight: 236, overflow: 'hidden' }}
      >
        <Animated.View style={[{ gap: 10 }, ciclo]}>
          <Escena {...opciones} />
        </Animated.View>
      </View>
    </Ciclo.Provider>
  );
}

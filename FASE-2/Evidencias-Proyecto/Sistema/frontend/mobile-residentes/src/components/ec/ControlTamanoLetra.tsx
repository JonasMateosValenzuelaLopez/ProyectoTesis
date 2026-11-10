import { useCallback, useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { F, useTema } from '@/constants/tema';
import { ESCALA_MAX, ESCALA_MIN, ESCALA_PASO, EscalaFija, ajustarEscala, useApariencia } from '@/context/Tema';
import Texto from './Texto';
import Boton from './Boton';

const ESPERA_REPETIR = 450; // ms manteniendo apretado antes de que empiece a repetirse
const CADA = 150; // ms entre un paso y el siguiente mientras se mantiene apretado

const porcentaje = (n: number) => `${Math.round(n * 100)} %`;

// Control de tamaño de letra: A− y A+. Un toque cambia 5 %; si se mantiene apretado, sigue
// cambiando solo hasta llegar al mínimo o al máximo. Pensado para personas mayores.
export default function ControlTamanoLetra({ vistaPrevia = true }: { vistaPrevia?: boolean }) {
  const t = useTema();
  const { escalaTexto, setEscalaTexto } = useApariencia();
  // El valor vigente en una referencia, para que la repetición siempre parta del último paso
  const actual = useRef(escalaTexto);
  useEffect(() => { actual.current = escalaTexto; }, [escalaTexto]);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repetir = useRef<ReturnType<typeof setInterval> | null>(null);

  const detener = useCallback(() => {
    if (espera.current) clearTimeout(espera.current);
    if (repetir.current) clearInterval(repetir.current);
    espera.current = null;
    repetir.current = null;
  }, []);

  // Da un paso y avisa si todavía se puede seguir en esa dirección
  const paso = useCallback((dir: 1 | -1) => {
    const siguiente = ajustarEscala(actual.current + dir * ESCALA_PASO);
    if (siguiente === actual.current) return false;
    actual.current = siguiente;
    setEscalaTexto(siguiente);
    return dir > 0 ? siguiente < ESCALA_MAX : siguiente > ESCALA_MIN;
  }, [setEscalaTexto]);

  const empezar = useCallback((dir: 1 | -1) => {
    detener();
    if (!paso(dir)) return;
    espera.current = setTimeout(() => {
      repetir.current = setInterval(() => { if (!paso(dir)) detener(); }, CADA);
    }, ESPERA_REPETIR);
  }, [detener, paso]);

  useEffect(() => detener, [detener]);

  const enMin = escalaTexto <= ESCALA_MIN;
  const enMax = escalaTexto >= ESCALA_MAX;

  const boton = (dir: 1 | -1, desactivado: boolean) => (
    <Pressable
      onPressIn={() => empezar(dir)} onPressOut={detener} disabled={desactivado}
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={({ pressed }) => ({
        width: 64, height: 56, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
        borderColor: t.botonBorde, backgroundColor: pressed ? t.inkSoft : t.surface, opacity: desactivado ? 0.4 : 1,
      })}
    >
      {/* Las letras de los botones no cambian de tamaño: así el botón nunca se descuadra */}
      <EscalaFija>
        <Texto style={{ fontFamily: F.negrita, fontSize: dir > 0 ? 24 : 17, lineHeight: 28, color: t.botonBorde }}>{dir > 0 ? 'A+' : 'A−'}</Texto>
      </EscalaFija>
    </Pressable>
  );

  return (
    <View style={{ gap: 12 }}>
      <View
        accessible accessibilityRole="adjustable" accessibilityLabel="Tamaño de letra"
        accessibilityValue={{ min: Math.round(ESCALA_MIN * 100), max: Math.round(ESCALA_MAX * 100), now: Math.round(escalaTexto * 100), text: porcentaje(escalaTexto) }}
        accessibilityActions={[{ name: 'increment', label: 'Agrandar letra' }, { name: 'decrement', label: 'Achicar letra' }]}
        onAccessibilityAction={(e) => { paso(e.nativeEvent.actionName === 'increment' ? 1 : -1); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        {boton(-1, enMin)}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <EscalaFija>
            <Texto v="cifra" style={{ fontSize: 28, lineHeight: 32 }}>{porcentaje(escalaTexto)}</Texto>
          </EscalaFija>
        </View>
        {boton(1, enMax)}
      </View>
      <Texto v="chico" style={{ textAlign: 'center' }}>Toca para cambiar de a poco o mantén apretado para avanzar rápido.</Texto>
      {vistaPrevia && (
        <View style={{ backgroundColor: t.paper, borderRadius: 14, padding: 14 }}>
          <Texto>Así se verán los avisos, los gastos comunes y las reservas.</Texto>
        </View>
      )}
      {escalaTexto !== 1 && (
        <Boton tipo="texto" texto="Volver al tamaño normal" icono="refresh-outline" onPress={() => { detener(); setEscalaTexto(1); }} />
      )}
    </View>
  );
}

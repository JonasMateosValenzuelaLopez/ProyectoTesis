import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { F, useTema } from '@/constants/tema';
import { motion } from '@/constants/tokens';
import Texto from './Texto';

const [x1, y1, x2, y2] = motion.ease.inOut;
const curva = Easing.bezier(x1, y1, x2, y2);
const PAD = 3;

// Control segmentado para filtrar (Todo · Oficial · Vecinos). La ficha blanca se desliza
// hasta la opción elegida para que se vea hacia dónde cambió el filtro.
export default function Segmentos<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  const t = useTema();
  const reducido = useReducedMotion();
  const [ancho, setAncho] = useState(0);
  const indice = Math.max(0, opciones.findIndex((o) => o.valor === valor));
  const segmento = ancho ? (ancho - PAD * 2 - PAD * (opciones.length - 1)) / opciones.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const destino = indice * (segmento + PAD);
    x.value = reducido || !segmento ? destino : withTiming(destino, { duration: motion.base, easing: curva });
  }, [indice, segmento, reducido, x]);

  const ficha = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      accessibilityRole="tablist" onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: t.line, borderRadius: 12, padding: PAD, gap: PAD }}
    >
      {segmento > 0 && (
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: PAD, bottom: PAD, left: PAD, width: segmento, borderRadius: 9, backgroundColor: t.surface }, ficha]} />
      )}
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor} accessibilityRole="tab" accessibilityState={{ selected: activo }} onPress={() => onCambio(o.valor)}
            style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: activo && !segmento ? t.surface : 'transparent' }}
          >
            <Texto style={{ fontFamily: activo ? F.negrita : F.medio, fontSize: 15, color: activo ? t.ink : t.ink2 }}>{o.texto}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

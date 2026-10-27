import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { motion } from '@/constants/tokens';
import Texto from './Texto';

// Confirmación breve después de una acción (voto registrado, reserva hecha…), arriba de la barra de pestañas.
// Entra y sale por abajo, el mismo borde; con movimiento reducido solo aparece y se desvanece.
const [x1, y1, x2, y2] = motion.ease.out;
const curva = Easing.bezier(x1, y1, x2, y2);

export default function Aviso() {
  const { aviso } = useApp();
  const t = useTema();
  const insets = useSafeAreaInsets();
  const reducido = useReducedMotion();
  if (!aviso) return null;
  const entrada = reducido ? FadeIn.duration(motion.fast) : SlideInDown.duration(motion.base).easing(curva);
  const salida = reducido ? FadeOut.duration(motion.fast) : SlideOutDown.duration(motion.fast).easing(curva);
  return (
    <Animated.View
      key={aviso} entering={entrada} exiting={salida}
      accessibilityLiveRegion="polite" pointerEvents="none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, backgroundColor: t.ink, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}
    >
      <Ionicons name="checkmark-circle" size={22} color={t.oscuro ? t.ok : '#7FD6A8'} />
      <Texto style={{ flex: 1, color: t.paper }}>{aviso}</Texto>
    </Animated.View>
  );
}

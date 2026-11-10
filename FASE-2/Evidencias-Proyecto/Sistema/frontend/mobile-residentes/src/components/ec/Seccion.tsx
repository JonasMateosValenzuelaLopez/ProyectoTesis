import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, Keyframe, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/constants/tema';
import Texto from './Texto';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Entrada al abrir la pantalla: sube 8 px y aparece, en 260 ms, una sección tras otra (50 ms entre cada una).
// Con "reducir movimiento" activado en el teléfono, la sección aparece sin animación.
function entrada(orden: number) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 8 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
  }).duration(260).delay(orden * 50).reduceMotion(ReduceMotion.System);
}

// Bloque del inicio con un encabezado grande (ícono + título) para que cada tipo de información
// se distinga de un vistazo, también para personas mayores.
export default function Seccion({ titulo, icono, derecha, orden = 0, children }:
  { titulo: string; icono: keyof typeof Ionicons.glyphMap; derecha?: ReactNode; orden?: number; children: ReactNode }) {
  const t = useTema();
  return (
    <Animated.View entering={entrada(orden)} style={{ gap: 10, marginTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36 }}>
        <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accionSoft }}>
          <Ionicons name={icono} size={18} color={t.accion} />
        </View>
        <Texto v="subtitulo" accessibilityRole="header" style={{ flex: 1 }}>{titulo}</Texto>
        {derecha}
      </View>
      {children}
    </Animated.View>
  );
}

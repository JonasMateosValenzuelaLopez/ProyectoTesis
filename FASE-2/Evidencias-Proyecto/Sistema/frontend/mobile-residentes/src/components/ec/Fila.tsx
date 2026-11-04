import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/constants/tema';
import Texto from './Texto';
import { usePresion } from './usePresion';

// Fila de lista: algo a la izquierda, título y detalle, y algo a la derecha (o una flecha si se puede tocar).
export default function Fila({ izquierda, titulo, detalle, derecha, onPress, borde = true }:
  { izquierda?: ReactNode; titulo: string; detalle?: string; derecha?: ReactNode; onPress?: () => void; borde?: boolean }) {
  const t = useTema();
  const presion = usePresion(0.98);
  const cuerpo = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48, paddingVertical: 10, borderTopWidth: borde ? 1 : 0, borderColor: t.line }}>
      {izquierda}
      <View style={{ flex: 1, gap: 2 }}>
        <Texto v="fuerte">{titulo}</Texto>
        {!!detalle && <Texto v="chico">{detalle}</Texto>}
      </View>
      {derecha ?? (onPress ? <Ionicons name="chevron-forward" size={20} color={t.ink2} /> : null)}
    </View>
  );
  if (!onPress) return cuerpo;
  // Al tocar, la fila se hunde apenas (escala 0.98 con resorte) y se marca con el fondo papel.
  return (
    <Pressable
      onPress={onPress} onPressIn={presion.onPressIn} onPressOut={presion.onPressOut} accessibilityRole="button"
      pressRetentionOffset={16}
      style={({ pressed }) => ({ backgroundColor: pressed ? t.paper : 'transparent', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10 })}
    >
      <Animated.View style={presion.estilo}>{cuerpo}</Animated.View>
    </Pressable>
  );
}

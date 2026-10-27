import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/constants/tema';
import Texto from './Texto';

// Fila de lista: algo a la izquierda, título y detalle, y algo a la derecha (o una flecha si se puede tocar).
export default function Fila({ izquierda, titulo, detalle, derecha, onPress, borde = true }:
  { izquierda?: ReactNode; titulo: string; detalle?: string; derecha?: ReactNode; onPress?: () => void; borde?: boolean }) {
  const t = useTema();
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
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>{cuerpo}</Pressable>;
}

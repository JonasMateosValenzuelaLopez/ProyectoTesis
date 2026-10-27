import { Pressable, ScrollView, View } from 'react-native';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

// Fichas para elegir una opción (día, bloque horario, tipo de visita). En fila con scroll o envolviendo.
export default function Opciones<T extends string>({ opciones, valor, onCambio, scroll = false, etiqueta }:
  { opciones: { valor: T; texto: string; detalle?: string; deshabilitada?: boolean }[]; valor: T | null; onCambio: (v: T) => void; scroll?: boolean; etiqueta?: string }) {
  const t = useTema();
  const fichas = opciones.map((o) => {
    const activo = o.valor === valor;
    return (
      <Pressable
        key={o.valor} accessibilityRole="radio" accessibilityState={{ selected: activo, disabled: o.deshabilitada }} disabled={o.deshabilitada}
        onPress={() => onCambio(o.valor)}
        style={{
          minHeight: 48, minWidth: 64, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
          borderWidth: activo ? 2 : 1.5, borderColor: activo ? t.cobalt : t.line, backgroundColor: activo ? t.cobaltSoft : t.surface,
          opacity: o.deshabilitada ? 0.4 : 1,
        }}
      >
        <Texto style={{ fontFamily: F.negrita, fontSize: 15, color: activo ? t.cobalt : t.ink, textDecorationLine: o.deshabilitada ? 'line-through' : 'none' }}>{o.texto}</Texto>
        {!!o.detalle && <Texto v="chico" style={{ color: activo ? t.cobalt : t.ink2 }}>{o.detalle}</Texto>}
      </Pressable>
    );
  });
  return (
    <View style={{ gap: 8 }}>
      {!!etiqueta && <Texto v="fuerte" style={{ fontSize: 15 }}>{etiqueta}</Texto>}
      {scroll
        ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} accessibilityRole="radiogroup">{fichas}</ScrollView>
        : <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{fichas}</View>}
    </View>
  );
}

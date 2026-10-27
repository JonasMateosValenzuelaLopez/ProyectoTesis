import { Pressable, View } from 'react-native';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

// Control segmentado para filtrar (Todo · Oficial · Vecinos)
export default function Segmentos<T extends string>({ opciones, valor, onCambio }: { opciones: { valor: T; texto: string }[]; valor: T; onCambio: (v: T) => void }) {
  const t = useTema();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: t.line, borderRadius: 12, padding: 3, gap: 3 }}>
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor} accessibilityRole="tab" accessibilityState={{ selected: activo }} onPress={() => onCambio(o.valor)}
            style={{ flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: activo ? t.surface : 'transparent' }}
          >
            <Texto style={{ fontFamily: activo ? F.negrita : F.medio, fontSize: 15, color: activo ? t.ink : t.ink2 }}>{o.texto}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

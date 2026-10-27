import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

// Acceso rápido de Inicio. El de visitas usa el amarillo aviso, igual que la garita.
export default function Atajo({ icono, texto, onPress, senal }: { icono: keyof typeof Ionicons.glyphMap; texto: string; onPress: () => void; senal?: boolean }) {
  const t = useTema();
  return (
    <Pressable
      onPress={onPress} accessibilityRole="button" accessibilityLabel={texto}
      style={({ pressed }) => ({
        flex: 1, minHeight: 92, borderRadius: 16, padding: 12, gap: 8, justifyContent: 'space-between',
        backgroundColor: senal ? t.signal : t.surface, borderWidth: 1, borderColor: senal ? t.signal : t.line,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: senal ? 'rgba(26,20,0,0.1)' : t.cobaltSoft }}>
        <Ionicons name={icono} size={22} color={senal ? t.signalInk : t.cobalt} />
      </View>
      <Texto style={{ fontFamily: F.negrita, fontSize: 15, lineHeight: 19, color: senal ? t.signalInk : t.ink }}>{texto}</Texto>
    </Pressable>
  );
}

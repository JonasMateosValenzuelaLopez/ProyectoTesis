import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';
import { PressableAnimado, usePresion } from './usePresion';

// Acceso rápido de Inicio. El de visitas usa el amarillo aviso, igual que la garita.
// El ícono va suelto y el texto manda: sin el cuadrado tintado de las apps de plantilla.
export default function Atajo({ icono, texto, onPress, senal }: { icono: keyof typeof Ionicons.glyphMap; texto: string; onPress: () => void; senal?: boolean }) {
  const t = useTema();
  const presion = usePresion();
  return (
    <PressableAnimado
      onPress={onPress} onPressIn={presion.onPressIn} onPressOut={presion.onPressOut}
      accessibilityRole="button" accessibilityLabel={texto}
      style={[{
        flex: 1, minHeight: 88, borderRadius: 12, padding: 12, gap: 10, justifyContent: 'space-between',
        backgroundColor: senal ? t.signal : t.surface, borderWidth: 1, borderColor: senal ? t.signal : t.line,
      }, presion.estilo]}
    >
      <Ionicons name={icono} size={26} color={senal ? t.signalInk : t.accion} />
      <Texto style={{ fontFamily: F.negrita, fontSize: 15, lineHeight: 19, color: senal ? t.signalInk : t.ink }}>{texto}</Texto>
    </PressableAnimado>
  );
}

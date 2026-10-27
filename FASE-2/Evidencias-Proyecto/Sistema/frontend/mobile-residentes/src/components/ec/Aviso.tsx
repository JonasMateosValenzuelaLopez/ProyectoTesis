import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import Texto from './Texto';

// Confirmación breve después de una acción (voto registrado, reserva hecha…), arriba de la barra de pestañas.
export default function Aviso() {
  const { aviso } = useApp();
  const t = useTema();
  const insets = useSafeAreaInsets();
  if (!aviso) return null;
  return (
    <View
      accessibilityLiveRegion="polite" pointerEvents="none"
      style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, backgroundColor: t.ink, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}
    >
      <Ionicons name="checkmark-circle" size={22} color={t.oscuro ? t.ok : '#7FD6A8'} />
      <Texto style={{ flex: 1, color: t.paper }}>{aviso}</Texto>
    </View>
  );
}

import { View, type ViewProps } from 'react-native';
import { sombra, useTema } from '@/constants/tema';

// Superficie blanca que flota sobre el papel con una sombra cálida (en oscuro, con un borde fino).
// `acento` marca lo oficial (pátina): el borde completo toma ese color, sin franjas.
export default function Tarjeta({ style, acento, ...rest }: ViewProps & { acento?: string }) {
  const t = useTema();
  return (
    <View
      {...rest}
      style={[{
        backgroundColor: t.surface, borderRadius: 20, borderWidth: acento ? 1.5 : t.oscuro ? 1 : 0, borderColor: acento ?? t.line, padding: 18, gap: 12,
      }, sombra(t), style]}
    />
  );
}

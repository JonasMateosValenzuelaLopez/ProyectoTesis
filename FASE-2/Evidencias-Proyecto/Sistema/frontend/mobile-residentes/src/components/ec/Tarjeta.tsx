import { View, type ViewProps } from 'react-native';
import { useTema } from '@/constants/tema';

// Contenedor de superficie con borde fino, como las tarjetas del panel.
// `acento` marca lo oficial (pátina): el borde completo toma ese color, sin franjas.
export default function Tarjeta({ style, acento, ...rest }: ViewProps & { acento?: string }) {
  const t = useTema();
  return (
    <View
      {...rest}
      style={[{
        backgroundColor: t.surface, borderRadius: 12, borderWidth: acento ? 1.5 : 1, borderColor: acento ?? t.line, padding: 16, gap: 12,
      }, style]}
    />
  );
}

import { View, type ViewProps } from 'react-native';
import { useTema } from '@/constants/tema';

// Contenedor de superficie con borde fino, como las tarjetas del panel.
export default function Tarjeta({ style, acento, ...rest }: ViewProps & { acento?: string }) {
  const t = useTema();
  return (
    <View
      {...rest}
      style={[{
        backgroundColor: t.surface, borderRadius: 16, borderWidth: 1, borderColor: t.line, padding: 16, gap: 12,
        ...(acento ? { borderLeftWidth: 4, borderLeftColor: acento } : {}),
      }, style]}
    />
  );
}

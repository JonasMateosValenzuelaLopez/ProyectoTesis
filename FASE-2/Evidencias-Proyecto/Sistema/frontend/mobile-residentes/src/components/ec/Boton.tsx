import { ActivityIndicator, Pressable, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

type Tipo = 'principal' | 'secundario' | 'texto' | 'peligro' | 'senal';

// Botón con área táctil de 48 px y respuesta al presionar (se hunde un poco).
export default function Boton({ texto, tipo = 'principal', icono, cargando, disabled, style, ...rest }:
  Omit<PressableProps, 'children' | 'style'> & { texto: string; tipo?: Tipo; icono?: keyof typeof Ionicons.glyphMap; cargando?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTema();
  const fondo = { principal: t.cobalt, secundario: t.surface, texto: 'transparent', peligro: t.surface, senal: t.signal }[tipo];
  const tinta = { principal: t.cobaltInk, secundario: t.cobalt, texto: t.cobalt, peligro: t.bad, senal: t.signalInk }[tipo];
  const borde = tipo === 'secundario' ? t.cobalt : tipo === 'peligro' ? t.bad : 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || cargando}
      {...rest}
      style={({ pressed }) => [{
        minHeight: 48, borderRadius: 12, paddingHorizontal: 18, backgroundColor: fondo, borderWidth: 1.5, borderColor: borde,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {cargando ? <ActivityIndicator color={tinta} /> : icono ? <Ionicons name={icono} size={20} color={tinta} /> : null}
        <Texto style={{ fontFamily: F.negrita, fontSize: 16, color: tinta }}>{texto}</Texto>
      </View>
    </Pressable>
  );
}

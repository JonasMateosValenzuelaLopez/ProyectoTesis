import { ActivityIndicator, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';
import { PressableAnimado, usePresion } from './usePresion';

type Tipo = 'principal' | 'secundario' | 'texto' | 'sutil' | 'peligro' | 'senal' | 'portada';

// Botón con área táctil de 48 px y respuesta al presionar (se hunde un poco con un resorte).
// `sutil` es para acciones secundarias que no deben competir con el contenido (reportar, descartar).
export default function Boton({ texto, tipo = 'principal', icono, cargando, disabled, style, onPressIn, onPressOut, ...rest }:
  Omit<PressableProps, 'children' | 'style'> & { texto: string; tipo?: Tipo; icono?: keyof typeof Ionicons.glyphMap; cargando?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTema();
  const presion = usePresion();
  const fondo = { principal: t.accion, secundario: t.surface, texto: 'transparent', sutil: 'transparent', peligro: t.surface, senal: t.signal, portada: t.bronzeOnSidebar }[tipo];
  const tinta = { principal: t.accionInk, secundario: t.accion, texto: t.accion, sutil: t.ink2, peligro: t.bad, senal: t.signalInk, portada: t.sidebar }[tipo];
  const borde = tipo === 'secundario' ? t.accion : tipo === 'peligro' ? t.bad : 'transparent';
  return (
    <PressableAnimado
      accessibilityRole="button"
      disabled={disabled || cargando}
      {...rest}
      onPressIn={(e) => { presion.onPressIn(); onPressIn?.(e); }}
      onPressOut={(e) => { presion.onPressOut(); onPressOut?.(e); }}
      style={[{
        minHeight: 48, borderRadius: 12, paddingHorizontal: 18, backgroundColor: fondo, borderWidth: 1.5, borderColor: borde,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1,
      }, presion.estilo, style]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {cargando ? <ActivityIndicator color={tinta} /> : icono ? <Ionicons name={icono} size={20} color={tinta} /> : null}
        <Texto style={{ fontFamily: tipo === 'sutil' ? F.medio : F.negrita, fontSize: tipo === 'sutil' ? 15 : 16, color: tinta }}>{texto}</Texto>
      </View>
    </PressableAnimado>
  );
}

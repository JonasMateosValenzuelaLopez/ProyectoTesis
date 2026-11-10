import { ActivityIndicator, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';
import { PressableAnimado, usePresion } from './usePresion';

type Tipo = 'principal' | 'secundario' | 'texto' | 'sutil' | 'peligro' | 'senal' | 'portada';

// Botón con área táctil de 52 px y respuesta al presionar (se hunde un poco con un resorte).
// `sutil` es para acciones secundarias que no deben competir con el contenido (reportar, descartar).
export default function Boton({ texto, tipo = 'principal', icono, cargando, disabled, style, onPressIn, onPressOut, ...rest }:
  Omit<PressableProps, 'children' | 'style'> & { texto: string; tipo?: Tipo; icono?: keyof typeof Ionicons.glyphMap; cargando?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTema();
  const presion = usePresion();
  // Principal y secundario en turquesa; en la portada (que ya es turquesa) el botón va con el color de la placa
  const fondo = { principal: t.boton, secundario: t.surface, texto: 'transparent', sutil: 'transparent', peligro: t.surface, senal: t.signal, portada: t.placaSidebar }[tipo];
  const tinta = { principal: t.botonInk, secundario: t.botonBorde, texto: t.accion, sutil: t.ink2, peligro: t.bad, senal: t.signalInk, portada: t.placaSidebarInk }[tipo];
  const borde = tipo === 'secundario' ? t.botonBorde : tipo === 'peligro' ? t.bad : 'transparent';
  return (
    <PressableAnimado
      accessibilityRole="button"
      disabled={disabled || cargando}
      {...rest}
      onPressIn={(e) => { presion.onPressIn(); onPressIn?.(e); }}
      onPressOut={(e) => { presion.onPressOut(); onPressOut?.(e); }}
      style={[{
        minHeight: 52, borderRadius: 16, paddingHorizontal: 20, backgroundColor: fondo, borderWidth: 1.5, borderColor: borde,
        alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1,
      }, presion.estilo, style]}
    >
      {/* Con letra grande el texto pasa a dos líneas dentro del botón en vez de salirse (flexShrink) */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
        {cargando ? <ActivityIndicator color={tinta} /> : icono ? <Ionicons name={icono} size={20} color={tinta} /> : null}
        <Texto style={{ fontFamily: tipo === 'sutil' ? F.medio : F.negrita, fontSize: tipo === 'sutil' ? 15 : 16, letterSpacing: -0.1, color: tinta, flexShrink: 1, textAlign: 'center' }}>{texto}</Texto>
      </View>
    </PressableAnimado>
  );
}

import { Text, type TextProps } from 'react-native';
import { F, useTema } from '@/constants/tema';

type Variante = 'titulo' | 'subtitulo' | 'cuerpo' | 'fuerte' | 'suave' | 'chico' | 'etiqueta' | 'cifra';

const ESTILOS: Record<Variante, object> = {
  titulo: { fontFamily: F.cifra, fontSize: 28, lineHeight: 32, letterSpacing: -0.3 },
  subtitulo: { fontFamily: F.negrita, fontSize: 18, lineHeight: 24 },
  cuerpo: { fontFamily: F.texto, fontSize: 16, lineHeight: 23 },
  fuerte: { fontFamily: F.negrita, fontSize: 16, lineHeight: 23 },
  suave: { fontFamily: F.texto, fontSize: 15, lineHeight: 21 },
  chico: { fontFamily: F.texto, fontSize: 13, lineHeight: 18 },
  etiqueta: { fontFamily: F.etiqueta, fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase' },
  cifra: { fontFamily: F.cifra, fontSize: 34, lineHeight: 38, fontVariant: ['tabular-nums'] },
};

// Texto con la escala tipográfica de EntreCasas
export default function Texto({ v = 'cuerpo', color, style, ...rest }: TextProps & { v?: Variante; color?: string }) {
  const t = useTema();
  const gris = v === 'suave' || v === 'chico' || v === 'etiqueta';
  return <Text {...rest} style={[ESTILOS[v], { color: color ?? (gris ? t.ink2 : t.ink) }, style]} />;
}

import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';
import { F, useTema } from '@/constants/tema';
import { ESCALA_TOPE_TOTAL, useEscalaTexto } from '@/context/Tema';

type Variante = 'titulo' | 'subtitulo' | 'cuerpo' | 'fuerte' | 'suave' | 'chico' | 'etiqueta' | 'cifra';

const ESTILOS: Record<Variante, TextStyle> = {
  titulo: { fontFamily: F.cifra, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  subtitulo: { fontFamily: F.negrita, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  cuerpo: { fontFamily: F.texto, fontSize: 16, lineHeight: 24 },
  fuerte: { fontFamily: F.negrita, fontSize: 16, lineHeight: 22 },
  suave: { fontFamily: F.texto, fontSize: 15, lineHeight: 21 },
  chico: { fontFamily: F.texto, fontSize: 13, lineHeight: 18 },
  etiqueta: { fontFamily: F.etiqueta, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase' },
  cifra: { fontFamily: F.cifra, fontSize: 36, lineHeight: 40, letterSpacing: -1, fontVariant: ['tabular-nums'] },
};

// Aplica el tamaño de letra elegido en la app al estilo final (también a los tamaños puestos a mano en `style`)
export function escalarEstilo(entrada: TextStyle | null | undefined, escala: number): TextStyle {
  const estilo = entrada ?? {};
  if (escala === 1) return estilo;
  const { fontSize, lineHeight, letterSpacing } = estilo;
  return {
    ...estilo,
    ...(fontSize != null ? { fontSize: fontSize * escala } : {}),
    ...(lineHeight != null ? { lineHeight: lineHeight * escala } : {}),
    ...(letterSpacing != null ? { letterSpacing: letterSpacing * escala } : {}),
  };
}

// El teléfono también agranda la letra (ajustes de accesibilidad): juntos no pasan de 2× el tamaño de diseño
export const multiplicadorSistema = (escala: number) => Math.max(1, ESCALA_TOPE_TOTAL / escala);

// Texto con la escala tipográfica de EntreCasas y el tamaño de letra que eligió la persona
export default function Texto({ v = 'cuerpo', color, style, ...rest }: TextProps & { v?: Variante; color?: string }) {
  const t = useTema();
  const escala = useEscalaTexto();
  const gris = v === 'suave' || v === 'chico' || v === 'etiqueta';
  const final = escalarEstilo(StyleSheet.flatten([ESTILOS[v], { color: color ?? (gris ? t.ink2 : t.ink) }, style]), escala);
  return <Text maxFontSizeMultiplier={multiplicadorSistema(escala)} {...rest} style={final} />;
}

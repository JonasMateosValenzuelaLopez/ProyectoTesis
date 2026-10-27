import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

// Campo de formulario con etiqueta arriba (siempre visible) y mensaje de error abajo.
export default function Campo({ etiqueta, error, ayuda, style, ...rest }: TextInputProps & { etiqueta: string; error?: string | false; ayuda?: string }) {
  const t = useTema();
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Texto v="fuerte" style={{ fontSize: 15 }}>{etiqueta}</Texto>
      <TextInput
        placeholderTextColor={t.placeholder}
        accessibilityLabel={etiqueta}
        {...rest}
        onFocus={(e) => { setFoco(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFoco(false); rest.onBlur?.(e); }}
        style={[{
          minHeight: 50, borderRadius: 12, borderWidth: foco ? 2 : 1.5, paddingHorizontal: foco ? 13.5 : 14,
          borderColor: error ? t.bad : foco ? t.accion : t.lineStrong, backgroundColor: t.surface,
          fontFamily: F.texto, fontSize: 17, color: t.ink,
        }, style]}
      />
      {error ? <Texto v="chico" color={t.bad}>{error}</Texto> : ayuda ? <Texto v="chico">{ayuda}</Texto> : null}
    </View>
  );
}

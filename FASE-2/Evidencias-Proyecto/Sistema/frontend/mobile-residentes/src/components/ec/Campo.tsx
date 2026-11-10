import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

// Campo de formulario con etiqueta arriba (siempre visible) y mensaje de error abajo.
// Si es de contraseña (`secureTextEntry`), muestra un ojo para ver lo que se escribió.
export default function Campo({ etiqueta, error, ayuda, style, secureTextEntry, ...rest }: TextInputProps & { etiqueta: string; error?: string | false; ayuda?: string }) {
  const t = useTema();
  const [foco, setFoco] = useState(false);
  const [visible, setVisible] = useState(false);
  const clave = !!secureTextEntry;
  const textoOjo = visible ? 'Ocultar contraseña' : 'Mostrar contraseña';
  return (
    <View style={{ gap: 6 }}>
      <Texto style={{ fontFamily: F.etiqueta, fontSize: 14, lineHeight: 18, color: t.ink2 }}>{etiqueta}</Texto>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor={t.placeholder}
          accessibilityLabel={etiqueta}
          {...rest}
          secureTextEntry={clave && !visible}
          autoCapitalize={clave ? 'none' : rest.autoCapitalize}
          autoCorrect={clave ? false : rest.autoCorrect}
          onFocus={(e) => { setFoco(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFoco(false); rest.onBlur?.(e); }}
          style={[{
            minHeight: 52, borderRadius: 14, borderWidth: foco ? 2 : 1, paddingHorizontal: foco ? 15 : 16,
            borderColor: error ? t.bad : foco ? t.accion : t.lineStrong, backgroundColor: t.surface,
            fontFamily: F.texto, fontSize: 17, color: t.ink,
          }, clave && { paddingRight: 52 }, style]}
        />
        {clave && (
          <Pressable
            onPress={() => setVisible((v) => !v)} hitSlop={8}
            accessibilityRole="button" accessibilityLabel={textoOjo} accessibilityState={{ checked: visible }}
            style={{ position: 'absolute', right: 6, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={t.ink2} />
          </Pressable>
        )}
      </View>
      {error ? <Texto v="chico" color={t.bad}>{error}</Texto> : ayuda ? <Texto v="chico">{ayuda}</Texto> : null}
    </View>
  );
}

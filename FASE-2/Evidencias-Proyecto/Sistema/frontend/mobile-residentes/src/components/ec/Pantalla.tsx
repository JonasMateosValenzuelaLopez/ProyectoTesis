import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/constants/tema';
import Texto from './Texto';

// Pantalla con fondo papel, márgenes de 16 px y encabezado opcional (contexto pequeño + título).
export default function Pantalla({ contexto, titulo, derecha, children, sinScroll, abajo }:
  { contexto?: string; titulo?: string; derecha?: ReactNode; children: ReactNode; sinScroll?: boolean; abajo?: ReactNode }) {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const encabezado = (titulo || contexto) && (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
      <View style={{ flex: 1 }}>
        {!!contexto && <Texto v="suave">{contexto}</Texto>}
        {!!titulo && <Texto v="titulo" accessibilityRole="header">{titulo}</Texto>}
      </View>
      {derecha}
    </View>
  );
  const contenido = (
    <>
      {encabezado}
      {children}
    </>
  );
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.paper }}>
      {sinScroll
        ? <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 16 }}>{contenido}</View>
        : (
          <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32, gap: 16 }} keyboardShouldPersistTaps="handled">
            {contenido}
          </ScrollView>
        )}
      {abajo && <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>{abajo}</View>}
    </KeyboardAvoidingView>
  );
}

import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTema } from '@/constants/tema';
import Texto from './Texto';

// Pantalla que se abre encima (invitar, reservar, publicar…): título, cerrar y acciones abajo.
export default function Hoja({ titulo, children, abajo }: { titulo: string; children: ReactNode; abajo?: ReactNode }) {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: t.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8, paddingHorizontal: 8, paddingBottom: 8, borderBottomWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>
        <Pressable onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={26} color={t.ink} />
        </Pressable>
        <Texto v="subtitulo" accessibilityRole="header" style={{ flex: 1 }}>{titulo}</Texto>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 18, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {abajo && <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderColor: t.line, backgroundColor: t.surface, gap: 8 }}>{abajo}</View>}
    </KeyboardAvoidingView>
  );
}

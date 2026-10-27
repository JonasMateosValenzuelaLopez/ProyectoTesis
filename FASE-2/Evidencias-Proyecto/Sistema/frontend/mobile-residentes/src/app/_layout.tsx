import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Archivo_500Medium, Archivo_600SemiBold, Archivo_800ExtraBold } from '@expo-google-fonts/archivo';
import {
  AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_500Medium, AtkinsonHyperlegibleNext_700Bold,
} from '@expo-google-fonts/atkinson-hyperlegible-next';
import { AppProvider } from '@/context/App';
import { useTema } from '@/constants/tema';
import Aviso from '@/components/ec/Aviso';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const t = useTema();
  const [listas, error] = useFonts({
    Archivo_500Medium, Archivo_600SemiBold, Archivo_800ExtraBold,
    AtkinsonHyperlegibleNext_400Regular, AtkinsonHyperlegibleNext_500Medium, AtkinsonHyperlegibleNext_700Bold,
  });

  useEffect(() => {
    if (listas || error) SplashScreen.hideAsync();
  }, [listas, error]);

  if (!listas && !error) return null;

  // El tema de navegación sigue al de la app, para que la barra de pestañas no salga negra sobre fondo claro
  const base = t.oscuro ? DarkTheme : DefaultTheme;
  const tema = { ...base, colors: { ...base.colors, primary: t.accion, background: t.paper, card: t.surface, text: t.ink, border: t.line } };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={tema}>
        <AppProvider>
          <View style={{ flex: 1, backgroundColor: t.paper }}>
            <StatusBar style={t.oscuro ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.paper } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="solicitar-acceso" />
              <Stack.Screen name="(tabs)" />
              {['invitar', 'invitacion/[id]', 'transferencia', 'reservar', 'publicar', 'votacion/[id]', 'aviso/[id]', 'invitaciones', 'contactos'].map((n) => (
                <Stack.Screen key={n} name={n} options={{ presentation: 'modal' }} />
              ))}
            </Stack>
            <Aviso />
          </View>
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

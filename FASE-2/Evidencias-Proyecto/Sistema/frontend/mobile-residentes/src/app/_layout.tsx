import { useEffect } from 'react';
import { View } from 'react-native';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts, Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold,
} from '@expo-google-fonts/archivo';
import { AppProvider } from '@/context/App';
import { TemaProvider } from '@/context/Tema';
import { useTema } from '@/constants/tema';
import Aviso from '@/components/ec/Aviso';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <TemaProvider>
      <Raiz />
    </TemaProvider>
  );
}

function Raiz() {
  const t = useTema();
  const [listas, error] = useFonts({
    Archivo_400Regular, Archivo_500Medium, Archivo_600SemiBold, Archivo_700Bold, Archivo_800ExtraBold,
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
              {/* Entrar y salir de la sesión cambian de pantalla con un fundido (después del saludo o la despedida) */}
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
              <Stack.Screen name="solicitar-acceso" />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              {/* El tutorial y la guía de bienvenida ocupan toda la pantalla y no se cierran deslizando: se terminan o se saltan */}
              <Stack.Screen name="bienvenida" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="tutorial" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
              {['invitar', 'invitacion/[id]', 'transferencia', 'reservar', 'publicar', 'votacion/[id]', 'aviso/[id]', 'invitaciones', 'contactos', 'actas', 'acta/[id]', 'mis-datos', 'cambiar-clave', 'mi-hogar', 'hogar/[id]', 'hogar-ficha'].map((n) => (
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

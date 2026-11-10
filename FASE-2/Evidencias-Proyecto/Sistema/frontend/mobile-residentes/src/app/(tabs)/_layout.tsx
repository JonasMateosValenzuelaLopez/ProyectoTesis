import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { F, sombra, useTema } from '@/constants/tema';

type Icono = keyof typeof Ionicons.glyphMap;
const icono = (lleno: Icono, linea: Icono) => {
  function IconoPestana({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? lleno : linea} size={24} color={color as string} />;
  }
  return IconoPestana;
};

// Pestañas: Inicio, Finanzas, Muro, Reservas, Mercado y Perfil. Las que dependen de un
// módulo se ocultan si la comunidad no lo tiene activo (`comunidad.modulos` del perfil).
export default function Pestanas() {
  const t = useTema();
  const { perfil, cargando, tiene } = useSesion();
  if (cargando) return null;
  if (!perfil) return <Redirect href="/login" />;

  // Con el módulo activo se muestra la pestaña; si la comunidad aún no tiene espacios, la pestaña lo explica
  const conReservas = tiene('reservas');
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accion,
        tabBarInactiveTintColor: t.ink2,
        tabBarStyle: { backgroundColor: t.surface, borderTopWidth: t.oscuro ? 1 : 0, borderTopColor: t.line, minHeight: 68, paddingTop: 6, ...sombra(t, 'raised') },
        tabBarLabelStyle: { fontFamily: F.etiqueta, fontSize: 11, letterSpacing: 0.2 },
        tabBarBadgeStyle: { backgroundColor: t.accion, color: t.accionInk, fontFamily: F.negrita, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('home', 'home-outline') }} />
      <Tabs.Screen name="finanzas" options={{ title: 'Finanzas', tabBarIcon: icono('wallet', 'wallet-outline'), href: tiene('cobros') ? undefined : null }} />
      <Tabs.Screen name="muro" options={{ title: 'Muro', tabBarIcon: icono('megaphone', 'megaphone-outline'), href: tiene('muro') || tiene('votaciones') ? undefined : null }} />
      <Tabs.Screen name="reservas" options={{ title: 'Reservas', tabBarIcon: icono('calendar', 'calendar-outline'), href: conReservas ? undefined : null }} />
      <Tabs.Screen name="mercado" options={{ title: 'Mercado', tabBarIcon: icono('storefront', 'storefront-outline'), href: tiene('marketplace') ? undefined : null }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

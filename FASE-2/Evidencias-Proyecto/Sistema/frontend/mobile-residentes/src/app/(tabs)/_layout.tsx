import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { espaciosActivos } from '@/data/demo';
import { F, useTema } from '@/constants/tema';

type Icono = keyof typeof Ionicons.glyphMap;
const icono = (lleno: Icono, linea: Icono) => {
  function IconoPestana({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Ionicons name={focused ? lleno : linea} size={24} color={color as string} />;
  }
  return IconoPestana;
};

// Pestañas: Inicio, Finanzas, Muro, Reservas, Mercado y Perfil. Las que dependen de un
// módulo se ocultan si la comunidad no lo tiene activo (por ejemplo, una villa sin espacios).
export default function Pestanas() {
  const t = useTema();
  const { cuenta, tiene, comunidad, pendientesMercado } = useApp();
  if (!cuenta) return <Redirect href="/login" />;

  const conReservas = tiene('reservas') && espaciosActivos(comunidad).length > 0;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accion,
        tabBarInactiveTintColor: t.ink2,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.line, minHeight: 64 },
        tabBarLabelStyle: { fontFamily: F.etiqueta, fontSize: 12 },
        tabBarBadgeStyle: { backgroundColor: t.accion, color: t.accionInk, fontFamily: F.negrita, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: icono('home', 'home-outline') }} />
      <Tabs.Screen name="finanzas" options={{ title: 'Finanzas', tabBarIcon: icono('wallet', 'wallet-outline'), href: tiene('cobros') ? undefined : null }} />
      <Tabs.Screen name="muro" options={{ title: 'Muro', tabBarIcon: icono('megaphone', 'megaphone-outline'), href: tiene('muro') || tiene('votaciones') ? undefined : null }} />
      <Tabs.Screen name="reservas" options={{ title: 'Reservas', tabBarIcon: icono('calendar', 'calendar-outline'), href: conReservas ? undefined : null }} />
      <Tabs.Screen name="mercado" options={{ title: 'Mercado', tabBarIcon: icono('storefront', 'storefront-outline'), href: tiene('marketplace') ? undefined : null, tabBarBadge: pendientesMercado || undefined }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

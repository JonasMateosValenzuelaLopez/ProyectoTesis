import { colors, status, radius } from './tokens';
import { Platform, useColorScheme } from 'react-native';
import { useApariencia } from '@/context/Tema';

// Familias cargadas con @expo-google-fonts en el layout raíz.
// Dirección "Portal": una sola familia, Archivo. Pesada para cifras y títulos, regular para leer.
export const F = {
  cifra: 'Archivo_800ExtraBold',
  etiqueta: 'Archivo_600SemiBold',
  numero: 'Archivo_500Medium',
  texto: 'Archivo_400Regular',
  medio: 'Archivo_500Medium',
  negrita: 'Archivo_700Bold',
};

export const R = radius;

// Colores en claro u oscuro: lo que eligió el residente o, si no eligió, lo que usa el teléfono
export function useTema() {
  const { apariencia } = useApariencia();
  const sistema = useColorScheme() === 'dark' ? 'dark' : 'light';
  const modo = apariencia === 'sistema' ? sistema : apariencia === 'oscuro' ? 'dark' : 'light';
  return { ...colors[modo], ...status[modo], oscuro: modo === 'dark' };
}
export type Tema = ReturnType<typeof useTema>;

// Sombra de tarjeta en claro (fría y difusa); en oscuro la tarjeta se separa con un borde fino.
export function sombra(t: Tema, nivel: 'card' | 'raised' = 'card') {
  if (t.oscuro) return nivel === 'raised' ? { boxShadow: '0 12px 32px rgba(0,0,0,0.45)' } : {};
  return Platform.OS === 'android'
    ? { elevation: nivel === 'raised' ? 6 : 2, shadowColor: '#102830' }
    : { boxShadow: nivel === 'raised' ? '0 2px 4px rgba(16,40,48,0.05), 0 12px 32px rgba(16,40,48,0.10)' : '0 1px 2px rgba(16,40,48,0.04), 0 4px 16px rgba(16,40,48,0.05)' };
}

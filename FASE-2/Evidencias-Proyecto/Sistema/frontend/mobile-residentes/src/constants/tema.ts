import { useColorScheme } from 'react-native';
import { colors, status, radius } from './tokens';

// Familias cargadas con @expo-google-fonts en el layout raíz.
// Archivo para cifras y números de unidad; Atkinson Hyperlegible Next para leer.
export const F = {
  cifra: 'Archivo_800ExtraBold',
  etiqueta: 'Archivo_600SemiBold',
  texto: 'AtkinsonHyperlegibleNext_400Regular',
  medio: 'AtkinsonHyperlegibleNext_500Medium',
  negrita: 'AtkinsonHyperlegibleNext_700Bold',
};

export const R = radius;

// Colores de la dirección "Placa y plano" según el modo claro u oscuro del teléfono
export function useTema() {
  const modo = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...colors[modo], ...status[modo], oscuro: modo === 'dark' };
}
export type Tema = ReturnType<typeof useTema>;

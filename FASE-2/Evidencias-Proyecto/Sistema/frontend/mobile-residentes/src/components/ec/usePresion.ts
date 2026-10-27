import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { motion } from '@/constants/tokens';

// Pressable que se puede animar en el hilo de UI.
export const PressableAnimado = Animated.createAnimatedComponent(Pressable);

// Respuesta al presionar: se hunde un poco con el resorte de los tokens y vuelve al soltar.
// Con movimiento reducido no cambia de tamaño; solo baja un poco la opacidad.
export function usePresion(escala = 0.97) {
  const reducido = useReducedMotion();
  const presionado = useSharedValue(0);
  const estilo = useAnimatedStyle(() => (reducido
    ? { opacity: 1 - presionado.value * 0.15 }
    : { transform: [{ scale: 1 - presionado.value * (1 - escala) }] }));
  return {
    estilo,
    onPressIn: () => { presionado.value = reducido ? withTiming(1, { duration: motion.fast }) : withSpring(1, motion.pressSpring); },
    onPressOut: () => { presionado.value = reducido ? withTiming(0, { duration: motion.fast }) : withSpring(0, motion.pressSpring); },
  };
}

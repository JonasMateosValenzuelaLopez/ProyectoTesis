import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, FadeIn, Keyframe, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useTema } from '@/constants/tema';
import Texto from './Texto';
import PlacaUnidad from './PlacaUnidad';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// La placa llega desde un poco más chica (0.92) y la frase sube 6 px, con curva ease-out.
const placaEntra = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
}).duration(320).delay(60).reduceMotion(ReduceMotion.System);
const textoEntra = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 6 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
}).duration(260).delay(140).reduceMotion(ReduceMotion.System);

// Pausa breve al entrar o salir de la sesión: la foto vertical de la comunidad, teñida con el color
// de la marca, cubre la pantalla; aparece la placa de la vivienda con un saludo o una despedida, y luego se cambia de pantalla.
// Con "reducir movimiento" se muestra lo mismo sin animar y la pausa es más corta.
export default function PasoSesion({ tipo, nombre, placa, alTerminar }:
  { tipo: 'entrar' | 'salir'; nombre: string; placa: { tipo: string; numero: string }; alTerminar: () => void }) {
  const t = useTema();
  const reducido = useReducedMotion();
  useEffect(() => {
    const espera = setTimeout(alTerminar, reducido ? 500 : tipo === 'entrar' ? 1000 : 800);
    return () => clearTimeout(espera);
  }, [alTerminar, reducido, tipo]);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200).easing(EASE_OUT).reduceMotion(ReduceMotion.System)}
        style={{ flex: 1, backgroundColor: t.sidebar, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, overflow: 'hidden' }}
      >
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}>
          <Image source={require('../../../assets/images/login-comunidad-vertical.jpg')} contentFit="cover" contentPosition="center" transition={0} style={{ flex: 1 }} />
          <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: t.sidebar, opacity: t.oscuro ? 0.84 : 0.78 }} />
        </View>
        <Animated.View entering={placaEntra}>
          <PlacaUnidad tipo={placa.tipo} numero={placa.numero} size="lg" invertida />
        </Animated.View>
        <Animated.View entering={textoEntra} style={{ alignItems: 'center', gap: 4 }}>
          <Texto v="titulo" accessibilityLiveRegion="polite" style={{ color: t.sidebarStrong, textAlign: 'center' }}>
            {tipo === 'entrar' ? `Hola, ${nombre}` : `Hasta pronto, ${nombre}`}
          </Texto>
          <Texto style={{ color: t.sidebarInk, textAlign: 'center' }}>{tipo === 'entrar' ? 'Entrando a tu comunidad…' : 'Cerrando tu sesión…'}</Texto>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

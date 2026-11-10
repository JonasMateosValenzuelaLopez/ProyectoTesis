import { Redirect } from 'expo-router';
import { useSesion } from '@/context/Sesion';

// Al abrir la app: mientras se recupera la sesión guardada no se muestra nada (sigue la pantalla de carga)
export default function Entrada() {
  const { perfil, cargando } = useSesion();
  if (cargando) return null;
  return <Redirect href={perfil ? '/(tabs)' : '/login'} />;
}

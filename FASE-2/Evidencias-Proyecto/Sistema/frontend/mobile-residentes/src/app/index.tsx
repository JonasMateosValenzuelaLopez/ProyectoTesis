import { View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';

// Al abrir la app: mientras se recupera la sesión guardada no se muestra nada (sigue la pantalla de carga).
// Si no se pudo llegar al servidor, la sesión se conserva y se ofrece reintentar en vez de pedir entrar de nuevo.
export default function Entrada() {
  const t = useTema();
  const { perfil, cargando, sinConexion, acciones } = useSesion();
  if (cargando) return null;
  if (!perfil && sinConexion) {
    return (
      <Pantalla>
        <View style={{ flex: 1, minHeight: 420, justifyContent: 'center', gap: 16 }}>
          <Ionicons name="cloud-offline-outline" size={44} color={t.accion} />
          <Texto v="titulo">Sin conexión</Texto>
          <Texto v="suave">{sinConexion}</Texto>
          <Texto v="suave">Tu sesión sigue guardada: cuando vuelva la conexión, entras sin escribir tu clave.</Texto>
          <Boton texto="Reintentar" icono="refresh" onPress={acciones.reintentar} />
          <Boton tipo="texto" texto="Entrar con otra cuenta" onPress={() => { acciones.cerrarSesion(); router.replace('/login'); }} />
        </View>
      </Pantalla>
    );
  }
  return <Redirect href={perfil ? '/(tabs)' : '/login'} />;
}

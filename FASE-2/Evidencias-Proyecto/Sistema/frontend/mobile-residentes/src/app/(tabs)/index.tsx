import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import { nombreUnidad, saludo } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Tarjeta from '@/components/ec/Tarjeta';
import Texto from '@/components/ec/Texto';
import Chip from '@/components/ec/Chip';
import PlacaUnidad from '@/components/ec/PlacaUnidad';

// Inicio. Lo que junta (cobros, visitas, reservas, votaciones, el muro) se arma a medida que cada
// módulo se conecta con la API; la versión con datos de prueba está en el commit d22b2ee.
// La primera vez que la persona entra, se abre el tutorial de la app y luego la guía de bienvenida.
export default function Inicio() {
  const t = useTema();
  const { perfil, comunidad, unidad, tutorialPendiente, guiaPendiente } = useSesion();

  // Primero el tutorial de la app (una vez por persona); después, la guía de bienvenida (una vez por vivienda)
  useEffect(() => {
    if (tutorialPendiente) router.push('/tutorial');
    else if (guiaPendiente) router.push('/bienvenida');
  }, [tutorialPendiente, guiaPendiente, unidad?.idUnidad]);

  if (!perfil || !comunidad || !unidad) return null;
  return (
    <Pantalla contexto={comunidad.nombre} titulo={`${saludo()}, ${perfil.nombre}`}>
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <PlacaUnidad tipo={unidad.tipoUnidad} numero={unidad.numeroIdentificador} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto v="subtitulo">{nombreUnidad(unidad)}</Texto>
            <Texto v="suave">{unidad.tipoResidencia} · {comunidad.nombre}</Texto>
          </View>
        </View>
      </Tarjeta>
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="sync-outline" size={22} color={t.accion} />
          <Texto v="fuerte" style={{ flex: 1 }}>Inicio se está conectando con los datos reales</Texto>
          <Chip texto="En conexión" tono="accion" />
        </View>
        <Texto v="suave">Aquí verás tus cobros, visitas, reservas y votaciones a medida que cada sección se conecte con la API de EntreCasas.</Texto>
      </Tarjeta>
    </Pantalla>
  );
}

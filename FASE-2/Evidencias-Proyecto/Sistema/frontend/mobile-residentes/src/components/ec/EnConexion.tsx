import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTema } from '@/constants/tema';
import { useSesion } from '@/context/Sesion';
import Pantalla from './Pantalla';
import Hoja from './Hoja';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';
import Chip from './Chip';

// Sección que todavía no muestra datos reales: se conecta con la API en la fase indicada.
// `hoja`: para las pantallas que se abren encima (con botón de cerrar), en vez de una pestaña.
export default function EnConexion({ titulo, fase, hoja }: { titulo: string; fase: number; hoja?: boolean }) {
  const t = useTema();
  const { comunidad } = useSesion();
  const aviso = (
    <Tarjeta>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="sync-outline" size={22} color={t.accion} />
        <Texto v="fuerte" style={{ flex: 1 }}>Se está conectando con los datos reales</Texto>
        <Chip texto="En conexión" tono="accion" />
      </View>
      <Texto v="suave">Esta sección se habilita en la fase {fase} de la conexión con la API de EntreCasas.</Texto>
    </Tarjeta>
  );
  if (hoja) {
    return <Hoja titulo={titulo} abajo={<Boton tipo="secundario" texto="Volver" onPress={() => router.back()} />}>{aviso}</Hoja>;
  }
  return <Pantalla contexto={comunidad?.nombre} titulo={titulo}>{aviso}</Pantalla>;
}

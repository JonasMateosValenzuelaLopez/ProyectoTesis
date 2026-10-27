import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';

const EMERGENCIAS = [
  { nombre: 'Ambulancia (SAMU)', telefono: '131' },
  { nombre: 'Bomberos', telefono: '132' },
  { nombre: 'Carabineros', telefono: '133' },
];

// Directorio oficial que publica la Secretaría, más los números de emergencia.
export default function Contactos() {
  const t = useTema();
  const { comunidad } = useApp();
  if (!comunidad) return null;
  const llamar = (tel: string) => Linking.openURL(`tel:${tel.replace(/\s/g, '')}`);
  const icono = <Ionicons name="call" size={20} color={t.cobalt} />;
  return (
    <Hoja titulo="Contactos">
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>{comunidad.nombre}</Texto>
        {comunidad.contactos.map((c, n) => <Fila key={c.nombre} borde={n > 0} titulo={c.nombre} detalle={`${c.detalle} · ${c.telefono}`} derecha={icono} onPress={() => llamar(c.telefono)} />)}
      </Tarjeta>
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>Emergencias</Texto>
        {EMERGENCIAS.map((c, n) => <Fila key={c.nombre} borde={n > 0} titulo={c.nombre} detalle={c.telefono} derecha={icono} onPress={() => llamar(c.telefono)} />)}
      </Tarjeta>
    </Hoja>
  );
}

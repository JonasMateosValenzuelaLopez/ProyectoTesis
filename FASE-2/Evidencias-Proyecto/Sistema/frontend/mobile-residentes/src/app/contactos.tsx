import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { EMERGENCIAS } from '@/data/demo';
import { useTema } from '@/constants/tema';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';

// Directorio oficial que publica la Secretaría, más los números de emergencia.
export default function Contactos() {
  const t = useTema();
  const { comunidad, contactos } = useApp();
  if (!comunidad) return null;
  const llamar = (tel: string) => Linking.openURL(`tel:${tel.replace(/\s/g, '')}`);
  const icono = <Ionicons name="call" size={20} color={t.accion} />;
  return (
    <Hoja titulo="Contactos">
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>{comunidad.nombre}</Texto>
        {contactos.length === 0 && <Texto v="suave">Secretaría aún no publica contactos.</Texto>}
        {contactos.map((c, n) => <Fila key={c.id_contacto} borde={n > 0} titulo={c.nombre} detalle={[c.detalle, c.horario, c.telefono].filter(Boolean).join(' · ')} derecha={icono} onPress={() => llamar(c.telefono)} />)}
      </Tarjeta>
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>Emergencias</Texto>
        {EMERGENCIAS.map((c, n) => <Fila key={c.nombre} borde={n > 0} titulo={c.nombre} detalle={c.telefono} derecha={icono} onPress={() => llamar(c.telefono)} />)}
      </Tarjeta>
    </Hoja>
  );
}

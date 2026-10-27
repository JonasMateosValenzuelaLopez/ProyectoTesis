import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { COMUNIDADES, UNIDADES } from '@/data/demo';
import { roles } from '@/constants/tokens';
import { nombreUnidad } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Fila from '@/components/ec/Fila';
import Chip from '@/components/ec/Chip';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import SelloCargo from '@/components/ec/SelloCargo';

const RELACION = { propietario: 'Propietario', arrendatario: 'Arrendatario' };

// Perfil: datos de la cuenta, viviendas (una persona puede vivir o tener más de una) y salida.
export default function Perfil() {
  const t = useTema();
  const { cuenta, unidad, comunidad, cargo, relacion, tiene, acciones } = useApp();
  if (!cuenta || !unidad || !comunidad) return null;
  const icono = (n: keyof typeof Ionicons.glyphMap) => <Ionicons name={n} size={22} color={t.cobalt} />;

  return (
    <Pantalla titulo="Perfil">
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto v="subtitulo">{cuenta.nombre} {cuenta.apellido}</Texto>
            <Texto v="suave">{relacion ? RELACION[relacion] : ''} · {comunidad.nombre}</Texto>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <SelloCargo cargo="residente" conTexto />
          {cargo && <View style={{ marginLeft: 8 }}><SelloCargo cargo={cargo} conTexto /></View>}
        </View>
        {cargo && <Texto v="chico">Como {roles[cargo].label.toLowerCase()} usas el panel web para tus tareas de cargo. En la app eres un vecino más.</Texto>}
      </Tarjeta>

      {cuenta.residencias.length > 1 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Mis viviendas</Texto>
          {cuenta.residencias.map((r, n) => {
            const u = UNIDADES[r.idUnidad];
            const red = COMUNIDADES.find((c) => c.id === u.idRed)!;
            const activa = r.idUnidad === unidad.id;
            return (
              <Fila
                key={r.idUnidad} borde={n > 0} izquierda={<PlacaUnidad tipo="" numero={u.numero} size="sm" />}
                titulo={`${nombreUnidad(u)} · ${red.nombre}`} detalle={RELACION[r.relacion]}
                derecha={activa ? <Chip texto="Viendo" tono="cobalto" /> : undefined}
                onPress={activa ? undefined : () => { acciones.cambiarUnidad(r.idUnidad); router.navigate('/(tabs)'); }}
              />
            );
          })}
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: 0 }}>
        {tiene('cobros') && <Fila borde={false} izquierda={icono('receipt-outline')} titulo="Mis pagos" detalle="Gastos comunes y quién marcó cada pago" onPress={() => router.push('/pagos')} />}
        {tiene('invitaciones_qr') && <Fila izquierda={icono('qr-code-outline')} titulo="Mis invitaciones" detalle="Códigos QR vigentes y anteriores" onPress={() => router.push('/invitaciones')} />}
        <Fila borde={tiene('cobros') || tiene('invitaciones_qr')} izquierda={icono('call-outline')} titulo="Contactos de la comunidad" detalle="Administración, conserjería y emergencias" onPress={() => router.push('/contactos')} />
      </Tarjeta>

      <Tarjeta style={{ gap: 0 }}>
        <Fila borde={false} titulo="RUT" detalle={cuenta.rut} />
        <Fila titulo="Correo" detalle={cuenta.correo} />
        <Fila titulo="Teléfono" detalle={cuenta.telefono} />
      </Tarjeta>

      <Boton tipo="peligro" texto="Cerrar sesión" icono="log-out-outline" onPress={() => { acciones.cerrarSesion(); router.replace('/login'); }} />
    </Pantalla>
  );
}

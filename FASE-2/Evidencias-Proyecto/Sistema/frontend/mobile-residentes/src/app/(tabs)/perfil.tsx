import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { UNIDADES, comunidadPorId, tipoUnidad } from '@/data/demo';
import { roles } from '@/constants/tokens';
import { nombreCompleto, nombreUnidad, telefono } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Fila from '@/components/ec/Fila';
import Chip from '@/components/ec/Chip';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import SelloCargo from '@/components/ec/SelloCargo';


// Perfil: datos de la cuenta, viviendas (una persona puede vivir o tener más de una) y salida.
export default function Perfil() {
  const t = useTema();
  const { cuenta, unidad, comunidad, cargo, relacion, tiene, acciones } = useApp();
  if (!cuenta || !unidad || !comunidad) return null;
  const viviendas = cuenta.residencias.filter((r) => r.estado === 'Activa');
  const icono = (n: keyof typeof Ionicons.glyphMap) => <Ionicons name={n} size={22} color={t.accion} />;

  return (
    <Pantalla titulo="Perfil">
      <Tarjeta>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <PlacaUnidad tipo={tipoUnidad(unidad)} numero={unidad.numero_identificador} />
          <View style={{ flex: 1, gap: 2 }}>
            <Texto v="subtitulo">{nombreCompleto(cuenta)}</Texto>
            <Texto v="suave">{relacion ?? ''} · {comunidad.nombre}</Texto>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <SelloCargo cargo="residente" conTexto />
          {cargo && <View style={{ marginLeft: 8 }}><SelloCargo cargo={cargo} conTexto /></View>}
        </View>
        {cargo && <Texto v="chico">Como {roles[cargo].label.toLowerCase()} usas el panel web para tus tareas de cargo. En la app eres un vecino más.</Texto>}
      </Tarjeta>

      {viviendas.length > 1 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Mis viviendas</Texto>
          {viviendas.map((r, n) => {
            const u = UNIDADES[r.id_unidad];
            const red = comunidadPorId(u.id_red)!;
            const activa = r.id_unidad === unidad.id_unidad;
            return (
              <Fila
                key={r.id_unidad} borde={n > 0} izquierda={<PlacaUnidad tipo="" numero={u.numero_identificador} size="sm" />}
                titulo={`${nombreUnidad(u)} · ${red.nombre}`} detalle={r.relacion}
                derecha={activa ? <Chip texto="Viendo" tono="accion" /> : undefined}
                onPress={activa ? undefined : () => { acciones.cambiarUnidad(r.id_unidad); router.navigate('/(tabs)'); }}
              />
            );
          })}
        </Tarjeta>
      )}

      <Tarjeta style={{ gap: 0 }}>
        {tiene('invitaciones_qr') && <Fila borde={false} izquierda={icono('qr-code-outline')} titulo="Mis invitaciones" detalle="Códigos QR vigentes y anteriores" onPress={() => router.push('/invitaciones')} />}
        <Fila borde={tiene('invitaciones_qr')} izquierda={icono('call-outline')} titulo="Contactos de la comunidad" detalle="Administración, conserjería y emergencias" onPress={() => router.push('/contactos')} />
        {tiene('votaciones') && <Fila izquierda={icono('book-outline')} titulo="Libro de actas" detalle="Reuniones y asambleas publicadas por Secretaría" onPress={() => router.push('/actas')} />}
      </Tarjeta>

      <Tarjeta style={{ gap: 0 }}>
        <Fila borde={false} titulo="RUT" detalle={cuenta.rut} />
        <Fila titulo="Correo" detalle={cuenta.correo} />
        <Fila titulo="Teléfono" detalle={telefono(cuenta.telefono) || 'Sin teléfono'} />
      </Tarjeta>

      <Boton tipo="peligro" texto="Cerrar sesión" icono="log-out-outline" onPress={() => { acciones.cerrarSesion(); router.replace('/login'); }} />
    </Pantalla>
  );
}

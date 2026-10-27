import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { cuando, diasHasta, fecha } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Chip from '@/components/ec/Chip';
import { espaciosActivos, hora } from '@/data/demo';
import Fila from '@/components/ec/Fila';

// Espacios comunes de la comunidad y las reservas de la vivienda.
export default function Reservas() {
  const t = useTema();
  const { comunidad, misReservas, reservasComunidad, espacioDe, tiene, acciones } = useApp();
  if (!comunidad) return null;
  const proximas = misReservas.filter((r) => r.estado_reserva === 'Aprobada' && diasHasta(r.fecha_reserva) >= 0).sort((a, b) => `${a.fecha_reserva}${a.hora_inicio}`.localeCompare(`${b.fecha_reserva}${b.hora_inicio}`));
  const anteriores = misReservas.filter((r) => !proximas.includes(r)).sort((a, b) => b.fecha_reserva.localeCompare(a.fecha_reserva));

  return (
    <Pantalla contexto={comunidad.nombre} titulo="Reservas">
      {proximas.length > 0 && (
        <Tarjeta>
          <Texto v="subtitulo">Tus próximas reservas</Texto>
          {proximas.map((r) => (
            <View key={r.id_reserva} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderColor: t.line }}>
              <Texto v="fuerte">{espacioDe(r.id_espacio)}, {cuando(r.fecha_reserva)}</Texto>
              <Texto v="suave">De {hora(r.hora_inicio)} a {hora(r.hora_fin)}{r.cantidad_invitados ? ` · ${r.cantidad_invitados} invitados` : ''}{tiene('conserjeria') ? ' · se retira en conserjería' : ''}</Texto>
              <Boton tipo="peligro" texto="Cancelar reserva" onPress={() => acciones.cancelarReserva(r.id_reserva)} style={{ alignSelf: 'flex-start', minHeight: 40 }} />
            </View>
          ))}
        </Tarjeta>
      )}

      {espaciosActivos(comunidad).map((e) => {
        const ocupadas = reservasComunidad.filter((r) => r.id_espacio === e.id_espacio && diasHasta(r.fecha_reserva) >= 0 && diasHasta(r.fecha_reserva) < 7).length;
        return (
          <Tarjeta key={e.id_espacio}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Texto v="subtitulo">{e.nombre}</Texto>
              {e.capacidad != null && <Chip texto={`Hasta ${e.capacidad} personas`} />}
            </View>
            {e.descripcion && <Texto v="suave">{e.descripcion}</Texto>}
            <Texto v="chico">{ocupadas ? `${ocupadas} ${ocupadas === 1 ? 'bloque reservado' : 'bloques reservados'} esta semana` : 'Libre toda la semana'}</Texto>
            <Boton tipo="secundario" texto={`Reservar ${e.nombre.toLowerCase()}`} onPress={() => router.push({ pathname: '/reservar', params: { espacio: String(e.id_espacio) } })} />
          </Tarjeta>
        );
      })}

      {anteriores.length > 0 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Anteriores</Texto>
          {anteriores.map((r, n) => (
            <Fila key={r.id_reserva} borde={n > 0} titulo={`${espacioDe(r.id_espacio)} · ${fecha(r.fecha_reserva)}`} detalle={`${hora(r.hora_inicio)} a ${hora(r.hora_fin)}`} derecha={<Chip texto={r.estado_reserva === 'Cancelada' || r.estado_reserva === 'Rechazada' ? r.estado_reserva : 'Usada'} tono={r.estado_reserva === 'Cancelada' || r.estado_reserva === 'Rechazada' ? 'bad' : 'neutro'} />} />
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}

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
import Fila from '@/components/ec/Fila';

// Espacios comunes de la comunidad y las reservas de la vivienda.
export default function Reservas() {
  const t = useTema();
  const { comunidad, misReservas, reservasComunidad, tiene, acciones } = useApp();
  if (!comunidad) return null;
  const proximas = misReservas.filter((r) => r.estado === 'confirmada' && diasHasta(r.fecha) >= 0).sort((a, b) => `${a.fecha}${a.desde}`.localeCompare(`${b.fecha}${b.desde}`));
  const anteriores = misReservas.filter((r) => !proximas.includes(r)).sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <Pantalla contexto={comunidad.nombre} titulo="Reservas">
      {proximas.length > 0 && (
        <Tarjeta acento={t.cobalt}>
          <Texto v="subtitulo">Tus próximas reservas</Texto>
          {proximas.map((r) => (
            <View key={r.id} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderColor: t.line }}>
              <Texto v="fuerte">{r.espacio}, {cuando(r.fecha)}</Texto>
              <Texto v="suave">De {r.desde} a {r.hasta}{r.invitados ? ` · ${r.invitados} invitados` : ''}{tiene('conserjeria') ? ' · se retira en conserjería' : ''}</Texto>
              <Boton tipo="peligro" texto="Cancelar reserva" onPress={() => acciones.cancelarReserva(r.id)} style={{ alignSelf: 'flex-start', minHeight: 40 }} />
            </View>
          ))}
        </Tarjeta>
      )}

      {comunidad.espacios.map((e) => {
        const ocupadas = reservasComunidad.filter((r) => r.espacio === e.nombre && diasHasta(r.fecha) >= 0 && diasHasta(r.fecha) < 7).length;
        return (
          <Tarjeta key={e.nombre}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <Texto v="subtitulo">{e.nombre}</Texto>
              <Chip texto={`Hasta ${e.capacidad} personas`} />
            </View>
            <Texto v="suave">{e.reglas}</Texto>
            <Texto v="chico">{ocupadas ? `${ocupadas} ${ocupadas === 1 ? 'bloque reservado' : 'bloques reservados'} esta semana` : 'Libre toda la semana'}</Texto>
            <Boton tipo="secundario" texto={`Reservar ${e.nombre.toLowerCase()}`} onPress={() => router.push({ pathname: '/reservar', params: { espacio: e.nombre } })} />
          </Tarjeta>
        );
      })}

      {anteriores.length > 0 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Anteriores</Texto>
          {anteriores.map((r, n) => (
            <Fila key={r.id} borde={n > 0} titulo={`${r.espacio} · ${fecha(r.fecha)}`} detalle={`${r.desde} a ${r.hasta}`} derecha={<Chip texto={r.estado === 'cancelada' ? 'Cancelada' : 'Usada'} tono={r.estado === 'cancelada' ? 'bad' : 'neutro'} />} />
          ))}
        </Tarjeta>
      )}
    </Pantalla>
  );
}

import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import type { Votacion } from '@/data/demo';
import { cuando, fecha } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';
import Chip from './Chip';

export function resultado(v: Votacion) {
  const votos = v.opciones.reduce((s, o) => s + o.votos, 0);
  const participacion = Math.round((votos / v.totalUnidades) * 100);
  const ganadora = [...v.opciones].sort((a, b) => b.votos - a.votos)[0];
  return { votos, participacion, ganadora, alcanzaQuorum: v.quorum == null || participacion >= v.quorum };
}

// Barra de resultados con la marca del quórum
export function Barras({ v, marcada }: { v: Votacion; marcada?: string | null }) {
  const t = useTema();
  const { votos } = resultado(v);
  return (
    <View style={{ gap: 10 }}>
      {v.opciones.map((o) => {
        const pct = votos ? Math.round((o.votos / votos) * 100) : 0;
        return (
          <View key={o.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Texto v={o.id === marcada ? 'fuerte' : 'cuerpo'}>{o.texto}{o.id === marcada ? ' · tu voto' : ''}</Texto>
              <Texto v="suave" style={{ fontFamily: F.numero, fontVariant: ['tabular-nums'] }}>{o.votos} · {pct}%</Texto>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: o.id === marcada ? t.accion : t.ink2 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function TarjetaVotacion({ v }: { v: Votacion }) {
  const t = useTema();
  const { miVoto } = useApp();
  const voto = miVoto(v.id);
  const r = resultado(v);
  const abierta = v.estado === 'abierta';
  return (
    <Tarjeta acento={abierta && !voto ? t.patina : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Texto v="etiqueta">{v.tipo === 'votacion' ? 'Votación' : 'Encuesta'} · {abierta ? `cierra ${cuando(v.cierre)}` : `cerró el ${fecha(v.cierre)}`}</Texto>
        {abierta ? (voto ? <Chip texto="Votaste" tono="ok" /> : <Chip texto="Abierta" tono="accion" />) : <Chip texto="Cerrada" />}
      </View>
      <Texto v="subtitulo">{v.titulo}</Texto>
      {(voto || !abierta) && <Barras v={v} marcada={voto} />}
      <Texto v="chico">
        {r.votos} de {v.totalUnidades} viviendas votaron ({r.participacion}%){v.quorum ? ` · quórum ${v.quorum}% ${r.alcanzaQuorum ? 'alcanzado' : 'pendiente'}` : ''}
      </Texto>
      {abierta && !voto && <Boton tipo="secundario" texto={v.tipo === 'votacion' ? 'Votar' : 'Responder'} onPress={() => router.push({ pathname: '/votacion/[id]', params: { id: v.id } })} />}
    </Tarjeta>
  );
}

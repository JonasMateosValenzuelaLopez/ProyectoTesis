import { View } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import type { Votacion } from '@/api/tipos';
import { cuando, fecha } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';
import Chip from './Chip';

// Lo que la vivienda elegida puede hacer en una votación: votar (es titular y no ha votado), ya votó, o solo mirar
export function estadoVivienda(v: Votacion, idUnidad?: number) {
  const voto = v.misVotos.find((x) => x.idUnidad === idUnidad)?.idOpcion ?? null;
  const puedeVotar = v.estado === 'Abierta' && idUnidad != null && v.puedeVotarPor.includes(idUnidad);
  return { voto, puedeVotar };
}

// Barras de resultados (solo cuando la API los entrega: la vivienda votó o la votación cerró)
export function Barras({ v, marcada }: { v: Votacion; marcada?: number | null }) {
  const t = useTema();
  const total = v.resultado?.votos ?? 0;
  return (
    <View style={{ gap: 10 }}>
      {v.opciones.map((o) => {
        const votos = o.votos ?? 0;
        const pct = total ? Math.round((votos / total) * 100) : 0;
        const gana = v.estado === 'Cerrada' && o.idOpcion === v.resultado?.idOpcionGanadora;
        return (
          <View key={o.idOpcion} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Texto v={o.idOpcion === marcada || gana ? 'fuerte' : 'cuerpo'} style={{ flex: 1 }}>{o.texto}{o.idOpcion === marcada ? ' · tu voto' : ''}</Texto>
              <Texto v="suave" style={{ fontFamily: F.numero, fontVariant: ['tabular-nums'] }}>{votos} · {pct}%</Texto>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden' }}>
              <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: o.idOpcion === marcada || gana ? t.accion : t.ink2 }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

// Resumen de participación y, al cerrar, el resultado
export function Participacion({ v }: { v: Votacion }) {
  const r = v.resultado;
  if (!r) return <Texto v="chico">{v.quorum ? `Se necesita que vote el ${v.quorum}% de las viviendas para que el resultado valga.` : 'Encuesta sin quórum.'}</Texto>;
  const ganadora = v.opciones.find((o) => o.idOpcion === r.idOpcionGanadora);
  return (
    <View style={{ gap: 4 }}>
      <Texto v="chico">
        {r.votos} de {v.totalUnidades} viviendas votaron ({r.participacion}%){v.quorum ? ` · quórum ${v.quorum}% ${r.alcanzaQuorum ? 'alcanzado' : 'pendiente'}` : ''}
      </Texto>
      {v.estado === 'Cerrada' && (
        <Texto v="fuerte">
          {!r.alcanzaQuorum ? 'No se alcanzó el quórum: el resultado no vale.' : ganadora ? `Resultado: ${ganadora.texto}` : r.votos ? 'Resultado: empate' : 'Nadie votó.'}
        </Texto>
      )}
    </View>
  );
}

export default function TarjetaVotacion({ v }: { v: Votacion }) {
  const t = useTema();
  const { unidad } = useSesion();
  const { voto, puedeVotar } = estadoVivienda(v, unidad?.idUnidad);
  const abierta = v.estado === 'Abierta';
  const abrir = () => router.push({ pathname: '/votacion/[id]', params: { id: String(v.idVotacion) } });
  return (
    <Tarjeta acento={puedeVotar ? t.patina : undefined}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Texto v="etiqueta" style={{ flex: 1 }}>{v.tipo} · {abierta ? `cierra ${cuando(v.fechaCierre)}` : `cerró el ${fecha(v.fechaCierre)}`}</Texto>
        {abierta ? (voto ? <Chip texto="Votaste" tono="ok" /> : <Chip texto="Abierta" tono="accion" />) : <Chip texto="Cerrada" />}
      </View>
      <Texto v="subtitulo">{v.titulo}</Texto>
      {v.resultado && <Barras v={v} marcada={voto} />}
      <Participacion v={v} />
      {puedeVotar
        ? <Boton tipo="secundario" texto={v.tipo === 'Votación' ? 'Votar' : 'Responder'} onPress={abrir} />
        : abierta && !voto && <Texto v="chico" color={t.ink2}>En tu vivienda vota la persona titular: un voto por vivienda.</Texto>}
    </Tarjeta>
  );
}

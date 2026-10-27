import { useState } from 'react';
import { View } from 'react-native';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { UNIDADES, type Publicacion } from '@/data/demo';
import { clp, hace, nombreUnidad } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';
import Chip from './Chip';
import PlacaUnidad from './PlacaUnidad';
import SelloCargo from './SelloCargo';

// Una publicación del muro o del mercado. Lo oficial lleva el sello de la directiva;
// lo de vecinos lleva la placa de su vivienda y se puede reportar.
export default function TarjetaPublicacion({ p }: { p: Publicacion }) {
  const t = useTema();
  const { unidad, acciones } = useApp();
  const [confirmar, setConfirmar] = useState<'reportar' | 'eliminar' | null>(null);
  const u = p.idUnidad ? UNIDADES[p.idUnidad] : undefined;
  const mia = !!unidad && p.idUnidad === unidad.id;

  return (
    <Tarjeta acento={p.oficial ? t.cobalt : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {p.oficial ? <SelloCargo cargo={p.oficial.cargo} size={30} /> : u ? <PlacaUnidad tipo="" numero={u.numero} size="sm" /> : null}
        <View style={{ flex: 1 }}>
          <Texto v="fuerte">{p.oficial ? `${p.oficial.tipo} oficial` : mia ? 'Tú' : p.autor}</Texto>
          <Texto v="chico">{p.oficial ? `Aprobado por ${p.oficial.aprobadoPor}` : `${nombreUnidad(u)} · ${hace(p.fecha)}`}</Texto>
        </View>
        {p.categoria && <Chip texto={p.categoria} tono={p.categoria === 'Vendo' ? 'cobalto' : p.categoria === 'Busco' ? 'senal' : 'neutro'} />}
      </View>
      {!!p.titulo && <Texto v="subtitulo">{p.titulo}</Texto>}
      <Texto>{p.texto}</Texto>
      {p.precio != null && <Texto v="cifra" style={{ fontSize: 22, lineHeight: 26 }}>{clp(p.precio)}</Texto>}

      {!p.oficial && !confirmar && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }}>
          {mia
            ? <Boton tipo="texto" texto="Eliminar" onPress={() => setConfirmar('eliminar')} style={{ minHeight: 40 }} />
            : p.reportadaPorMi
              ? <Texto v="chico" style={{ paddingVertical: 10 }}>Reportaste esta publicación</Texto>
              : <Boton tipo="texto" texto="Reportar" onPress={() => setConfirmar('reportar')} style={{ minHeight: 40 }} />}
        </View>
      )}
      {confirmar && (
        <View style={{ backgroundColor: t.paper, borderRadius: 12, padding: 12, gap: 10 }}>
          <Texto>{confirmar === 'reportar' ? '¿Reportar a la administración? Quien publicó no sabrá que fuiste tú.' : '¿Eliminar tu publicación?'}</Texto>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Boton tipo="peligro" texto={confirmar === 'reportar' ? 'Reportar' : 'Eliminar'} style={{ flex: 1 }}
              onPress={() => { if (confirmar === 'reportar') acciones.reportar(p.id); else acciones.eliminarPublicacion(p.id); setConfirmar(null); }} />
            <Boton tipo="secundario" texto="No" style={{ flex: 1 }} onPress={() => setConfirmar(null)} />
          </View>
        </View>
      )}
    </Tarjeta>
  );
}

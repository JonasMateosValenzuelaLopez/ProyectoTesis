import { useState } from 'react';
import { View } from 'react-native';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { mensajeDe } from '@/api/cliente';
import { ID_ROL_POR_NOMBRE, RolUsuario, type PublicacionMuro } from '@/api/tipos';
import { hace } from '@/utils/formato';
import Tarjeta from './Tarjeta';
import Texto from './Texto';
import Boton from './Boton';
import Chip from './Chip';
import PlacaUnidad from './PlacaUnidad';
import SelloCargo from './SelloCargo';
import Confirmar from './ConfirmarAccion';

// Una publicación del muro. Lo oficial (comunicado o norma) lleva el sello del cargo de quien lo redactó;
// lo de vecinos lleva la placa de su vivienda, se puede reportar y quien lo publicó lo puede eliminar.
export default function TarjetaPublicacion({ p, onCambio, onEliminada }: {
  p: PublicacionMuro; onCambio: (p: PublicacionMuro) => void; onEliminada: (id: number) => void;
}) {
  const t = useTema();
  const { comunidad, acciones } = useSesion();
  const [confirmar, setConfirmar] = useState<'reportar' | 'eliminar' | null>(null);
  const oficial = p.tipo !== 'Vecino';
  const oculta = p.estadoModeracion === 'Oculta';
  const tipoVivienda = comunidad?.tipo === 'Edificio' ? 'Depto' : 'Casa';
  const cargo = oficial ? ID_ROL_POR_NOMBRE[p.autor?.cargo ?? ''] ?? RolUsuario.PRESIDENTE : null;

  const hacer = async (motivo?: string) => {
    try {
      if (confirmar === 'eliminar') {
        await muroApi.eliminarPublicacion(p.idPublicacion);
        acciones.avisar('Publicación eliminada.');
        onEliminada(p.idPublicacion);
      } else if (motivo) {
        await muroApi.reportarPublicacion(p.idPublicacion, motivo);
        acciones.avisar('Gracias. La administración revisará la publicación.');
        onCambio({ ...p, reportadaPorMi: true });
      }
      setConfirmar(null);
    } catch (e) {
      acciones.avisar(mensajeDe(e));
    }
  };

  return (
    <Tarjeta acento={oficial ? t.patina : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {cargo ? <SelloCargo cargo={cargo} size={30} /> : p.unidad ? <PlacaUnidad tipo="" numero={p.unidad.numeroIdentificador} size="sm" /> : null}
        <View style={{ flex: 1 }}>
          <Texto v="fuerte">{oficial ? `${p.tipo} oficial` : p.esMia ? 'Tú' : p.autor?.nombre ?? 'Un vecino'}</Texto>
          <Texto v="chico">
            {oficial
              ? [p.autor?.cargo ?? 'Directiva', hace(p.fecha)].join(' · ')
              : [p.unidad ? `${tipoVivienda} ${p.unidad.numeroIdentificador}` : null, hace(p.fecha)].filter(Boolean).join(' · ')}
          </Texto>
        </View>
        {oculta && <Chip texto="Oculta" tono="bad" />}
      </View>
      {!!p.titulo && <Texto v="subtitulo">{p.titulo}</Texto>}
      <Texto>{p.contenido}</Texto>
      {oculta && p.esMia && <Texto v="chico" color={t.bad}>La administración ocultó tu publicación: tus vecinos ya no la ven.</Texto>}

      {!oficial && !confirmar && (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -8, marginBottom: -8 }}>
          {p.esMia
            ? <Boton tipo="texto" texto="Eliminar" onPress={() => setConfirmar('eliminar')} style={{ minHeight: 40 }} />
            : p.reportadaPorMi
              ? <Texto v="chico" style={{ paddingVertical: 10 }}>Reportaste esta publicación</Texto>
              : <Boton tipo="sutil" texto="Reportar" onPress={() => setConfirmar('reportar')} style={{ minHeight: 40 }} />}
        </View>
      )}
      {confirmar && <Confirmar tipo={confirmar} onConfirmar={hacer} onCancelar={() => setConfirmar(null)} />}
    </Tarjeta>
  );
}

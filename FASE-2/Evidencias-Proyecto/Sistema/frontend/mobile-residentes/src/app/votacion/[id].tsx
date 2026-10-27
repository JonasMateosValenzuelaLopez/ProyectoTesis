import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/context/App';
import { fechaLargaTexto, nombreUnidad } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import { Barras, resultado } from '@/components/ec/TarjetaVotacion';

// Votar: una vivienda, un voto. El voto queda a nombre de la unidad, no se puede cambiar.
export default function Votar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { votaciones, miVoto, unidad, acciones } = useApp();
  const v = votaciones.find((x) => x.id === id);
  const [eleccion, setEleccion] = useState<string | null>(null);
  if (!v || !unidad) return <Hoja titulo="Votación"><Texto>No encontramos esta votación.</Texto></Hoja>;
  const voto = miVoto(v.id);
  const r = resultado(v);

  if (voto || v.estado === 'cerrada') {
    return (
      <Hoja titulo={v.tipo === 'votacion' ? 'Votación' : 'Encuesta'} abajo={<Boton texto="Listo" onPress={() => router.back()} />}>
        <Texto v="titulo">{v.titulo}</Texto>
        <Barras v={v} marcada={voto} />
        <Texto v="suave">{r.votos} de {v.totalUnidades} viviendas votaron ({r.participacion}%).{v.quorum ? ` Se necesita ${v.quorum}% para que el resultado valga.` : ''}</Texto>
      </Hoja>
    );
  }

  return (
    <Hoja titulo={v.tipo === 'votacion' ? 'Votar' : 'Responder encuesta'} abajo={<Boton texto="Enviar mi voto" disabled={!eleccion} onPress={() => eleccion && acciones.votar(v.id, eleccion)} />}>
      <Texto v="titulo">{v.titulo}</Texto>
      <Texto>{v.descripcion}</Texto>
      <Texto v="suave">Cierra el {fechaLargaTexto(v.cierre)}. Votas por {nombreUnidad(unidad)}: un voto por vivienda, y no se puede cambiar después.</Texto>
      <Opciones valor={eleccion} onCambio={setEleccion} opciones={v.opciones.map((o) => ({ valor: o.id, texto: o.texto }))} />
    </Hoja>
  );
}

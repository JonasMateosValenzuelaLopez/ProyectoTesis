import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaPublicacion from '@/components/ec/TarjetaPublicacion';
import TarjetaVotacion from '@/components/ec/TarjetaVotacion';

type Filtro = 'todo' | 'oficial' | 'vecinos' | 'votaciones';

// Muro de la comunidad: comunicados y normas oficiales, avisos de vecinos y votaciones.
export default function Muro() {
  const { comunidad, publicaciones, votaciones, tiene, miVoto } = useApp();
  const [filtro, setFiltro] = useState<Filtro>(tiene('muro') ? 'todo' : 'votaciones');
  if (!comunidad) return null;

  const muro = publicaciones.filter((p) => p.lugar === 'muro').sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lista = filtro === 'oficial' ? muro.filter((p) => p.oficial) : filtro === 'vecinos' ? muro.filter((p) => !p.oficial) : muro;
  const pendientes = votaciones.filter((v) => v.estado === 'Abierta' && !miVoto(v.id_votacion)).length;
  const opciones = [
    ...(tiene('muro') ? [{ valor: 'todo' as const, texto: 'Todo' }, { valor: 'oficial' as const, texto: 'Oficial' }, { valor: 'vecinos' as const, texto: 'Vecinos' }] : []),
    ...(tiene('votaciones') ? [{ valor: 'votaciones' as const, texto: pendientes ? `Votar (${pendientes})` : 'Votaciones' }] : []),
  ];

  return (
    <Pantalla
      contexto={comunidad.nombre} titulo="Muro"
      derecha={tiene('muro') ? <Boton texto="Publicar" icono="create-outline" onPress={() => router.push('/publicar')} style={{ minHeight: 44, paddingHorizontal: 14 }} /> : undefined}
    >
      {opciones.length > 1 && <Segmentos opciones={opciones} valor={filtro} onCambio={setFiltro} />}
      {filtro === 'votaciones'
        ? (votaciones.length ? [...votaciones].sort((a, b) => (a.estado !== b.estado ? (a.estado === 'Abierta' ? -1 : 1) : a.estado === 'Abierta' ? a.fecha_cierre.localeCompare(b.fecha_cierre) : b.fecha_cierre.localeCompare(a.fecha_cierre))).map((v) => <TarjetaVotacion key={v.id_votacion} v={v} />)
          : <Texto v="suave">No hay votaciones todavía.</Texto>)
        : lista.length ? lista.map((p) => <TarjetaPublicacion key={p.clave} p={p} />) : <Texto v="suave">Nada por aquí todavía.</Texto>}
    </Pantalla>
  );
}

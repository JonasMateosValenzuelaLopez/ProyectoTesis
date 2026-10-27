import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaPublicacion from '@/components/ec/TarjetaPublicacion';

type Filtro = 'todo' | 'Vendo' | 'Servicio' | 'Busco';

// Mercado vecinal: ventas, servicios y pedidos entre vecinos de la misma comunidad.
export default function Mercado() {
  const { comunidad, publicaciones } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('todo');
  if (!comunidad) return null;
  const lista = publicaciones
    .filter((p) => p.lugar === 'mercado' && (filtro === 'todo' || p.categoria === filtro))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <Pantalla
      contexto={comunidad.nombre} titulo="Mercado"
      derecha={<Boton texto="Publicar" icono="add" onPress={() => router.push({ pathname: '/publicar', params: { lugar: 'mercado' } })} style={{ minHeight: 44, paddingHorizontal: 14 }} />}
    >
      <Segmentos opciones={[{ valor: 'todo', texto: 'Todo' }, { valor: 'Vendo', texto: 'Venta' }, { valor: 'Servicio', texto: 'Servicios' }, { valor: 'Busco', texto: 'Busco' }]} valor={filtro} onCambio={setFiltro} />
      {lista.length ? lista.map((p) => <TarjetaPublicacion key={p.id} p={p} />) : <Texto v="suave">No hay avisos en esta categoría.</Texto>}
      <Texto v="chico" style={{ textAlign: 'center' }}>Para comprar o contratar, coordina directamente con tu vecino. EntreCasas no cobra ni intermedia.</Texto>
    </Pantalla>
  );
}

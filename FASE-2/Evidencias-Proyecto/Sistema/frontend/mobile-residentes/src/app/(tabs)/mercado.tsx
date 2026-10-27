import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import Tarjeta from '@/components/ec/Tarjeta';
import SolicitudRecibida from '@/components/ec/SolicitudRecibida';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaPublicacion from '@/components/ec/TarjetaPublicacion';

type Filtro = 'todo' | 'Vendo' | 'Servicio' | 'Busco';

// Mercado vecinal: ventas, servicios y pedidos entre vecinos de la misma comunidad.
export default function Mercado() {
  const { comunidad, publicaciones, solicitudesRecibidas, misSolicitudes } = useApp();
  const [filtro, setFiltro] = useState<Filtro>('todo');
  if (!comunidad) return null;
  const lista = publicaciones
    .filter((p) => p.lugar === 'mercado' && (filtro === 'todo' || p.categoria === filtro))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const porResponder = solicitudesRecibidas.filter((s) => s.estado === 'pendiente');
  const respuestas = misSolicitudes.filter((s) => s.estado !== 'pendiente' && !s.vista);
  const textoDe = (id: string) => {
    const t = publicaciones.find((p) => p.id === id)?.texto ?? '';
    return t.length > 40 ? `${t.slice(0, t.lastIndexOf(' ', 40))}…` : t;
  };
  const autorDe = (id: string) => publicaciones.find((p) => p.id === id)?.autor.split(' ')[0] ?? 'Tu vecino';
  return (
    <Pantalla
      contexto={comunidad.nombre} titulo="Mercado"
      derecha={<Boton texto="Publicar" icono="add" onPress={() => router.push({ pathname: '/publicar', params: { lugar: 'mercado' } })} style={{ minHeight: 44, paddingHorizontal: 14 }} />}
    >
      {porResponder.length > 0 && (
        <Tarjeta>
          <Texto v="etiqueta">{porResponder.length === 1 ? 'Un vecino quiere contactarte' : `${porResponder.length} vecinos quieren contactarte`}</Texto>
          <Texto v="chico">Si aceptas, le compartimos tu teléfono. Si rechazas, le avisamos que ya no está disponible.</Texto>
          {porResponder.map((s) => <SolicitudRecibida key={s.id} s={s} aviso={textoDe(s.idPublicacion)} />)}
        </Tarjeta>
      )}
      {respuestas.length > 0 && (
        <Tarjeta>
          <Texto v="etiqueta">Respuestas a tus solicitudes</Texto>
          {respuestas.map((s) => (
            <Boton
              key={s.id} tipo={s.estado === 'aceptada' ? 'principal' : 'secundario'} icono={s.estado === 'aceptada' ? 'logo-whatsapp' : 'close-circle-outline'}
              texto={s.estado === 'aceptada' ? `${autorDe(s.idPublicacion)} aceptó: ver contacto` : `${autorDe(s.idPublicacion)}: ya no está disponible`}
              onPress={() => router.push({ pathname: '/aviso/[id]', params: { id: s.idPublicacion } })}
            />
          ))}
        </Tarjeta>
      )}
      <Segmentos opciones={[{ valor: 'todo', texto: 'Todo' }, { valor: 'Vendo', texto: 'Venta' }, { valor: 'Servicio', texto: 'Servicios' }, { valor: 'Busco', texto: 'Busco' }]} valor={filtro} onCambio={setFiltro} />
      {lista.length ? lista.map((p) => <TarjetaPublicacion key={p.id} p={p} alTocar={() => router.push({ pathname: '/aviso/[id]', params: { id: p.id } })} />) : <Texto v="suave">No hay avisos en esta categoría.</Texto>}
      <Texto v="chico" style={{ textAlign: 'center' }}>Para comprar o contratar, coordina directamente con tu vecino. EntreCasas no cobra ni intermedia.</Texto>
    </Pantalla>
  );
}

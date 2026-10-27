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
  const porResponder = solicitudesRecibidas.filter((s) => s.estado === 'Pendiente');
  const respuestas = misSolicitudes.filter((s) => s.estado !== 'Pendiente' && !s.vista);
  const aviso = (id: number) => publicaciones.find((p) => p.lugar === 'mercado' && p.id === id);
  const autorDe = (id: number) => aviso(id)?.autor.split(' ')[0] ?? 'Tu vecino';
  return (
    <Pantalla
      contexto={comunidad.nombre} titulo="Mercado"
      derecha={<Boton texto="Publicar" icono="add" onPress={() => router.push({ pathname: '/publicar', params: { lugar: 'mercado' } })} style={{ minHeight: 44, paddingHorizontal: 14 }} />}
    >
      {porResponder.length > 0 && (
        <Tarjeta>
          <Texto v="etiqueta">{porResponder.length === 1 ? 'Un vecino quiere contactarte' : `${porResponder.length} vecinos quieren contactarte`}</Texto>
          <Texto v="chico">Si aceptas, le compartimos tu teléfono. Si rechazas, le avisamos que ya no está disponible.</Texto>
          {porResponder.map((s) => <SolicitudRecibida key={s.id_solicitud} s={s} aviso={aviso(s.id_producto)?.titulo ?? ''} />)}
        </Tarjeta>
      )}
      {respuestas.length > 0 && (
        <Tarjeta>
          <Texto v="etiqueta">Respuestas a tus solicitudes</Texto>
          {respuestas.map((s) => (
            <Boton
              key={s.id_solicitud} tipo={s.estado === 'Aceptada' ? 'principal' : 'secundario'} icono={s.estado === 'Aceptada' ? 'logo-whatsapp' : 'close-circle-outline'}
              texto={s.estado === 'Aceptada' ? `${autorDe(s.id_producto)} aceptó: ver contacto` : `${autorDe(s.id_producto)}: ya no está disponible`}
              onPress={() => router.push({ pathname: '/aviso/[id]', params: { id: String(s.id_producto) } })}
            />
          ))}
        </Tarjeta>
      )}
      <Segmentos opciones={[{ valor: 'todo', texto: 'Todo' }, { valor: 'Vendo', texto: 'Venta' }, { valor: 'Servicio', texto: 'Servicios' }, { valor: 'Busco', texto: 'Busco' }]} valor={filtro} onCambio={setFiltro} />
      {lista.length ? lista.map((p) => <TarjetaPublicacion key={p.clave} p={p} alTocar={() => router.push({ pathname: '/aviso/[id]', params: { id: String(p.id) } })} />) : <Texto v="suave">No hay avisos en esta categoría.</Texto>}
      <Texto v="chico" style={{ textAlign: 'center' }}>Para comprar o contratar, coordina directamente con tu vecino. EntreCasas no cobra ni intermedia.</Texto>
    </Pantalla>
  );
}

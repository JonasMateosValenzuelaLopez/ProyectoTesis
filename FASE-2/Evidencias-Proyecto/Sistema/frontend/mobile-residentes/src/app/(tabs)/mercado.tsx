import { useState } from 'react';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { MAX_AVISOS_DISPONIBLES } from '@/data/demo';
import Tarjeta from '@/components/ec/Tarjeta';
import SolicitudRecibida from '@/components/ec/SolicitudRecibida';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaPublicacion from '@/components/ec/TarjetaPublicacion';

type Seccion = 'comunidad' | 'mios';
type Filtro = 'todo' | 'Vendo' | 'Servicio' | 'Busco';

// Mercado vecinal: ventas, servicios y pedidos entre vecinos de la misma comunidad.
// «Mis avisos» muestra todos los de esta persona, también los vendidos o cerrados y los que ocultó
// la administración, que no aparecen en la lista de la comunidad.
export default function Mercado() {
  const { comunidad, publicaciones, misDisponibles, solicitudesRecibidas, misSolicitudes } = useApp();
  const [seccion, setSeccion] = useState<Seccion>('comunidad');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  if (!comunidad) return null;
  const avisos = publicaciones.filter((p) => p.lugar === 'mercado').sort((a, b) => b.fecha.localeCompare(a.fecha));
  const lista = avisos.filter((p) => !p.cerrado && !p.oculto && (filtro === 'todo' || p.tipo === filtro));
  // Primero los disponibles, después los cerrados y al final los ocultos
  const mios = avisos.filter((p) => p.mia).sort((a, b) => Number(a.oculto) - Number(b.oculto) || Number(a.cerrado) - Number(b.cerrado));
  const porResponder = solicitudesRecibidas.filter((s) => s.estado === 'Pendiente');
  const respuestas = misSolicitudes.filter((s) => s.estado !== 'Pendiente' && !s.vista);
  const aviso = (id: number) => avisos.find((p) => p.id === id);
  const autorDe = (id: number) => aviso(id)?.autor.split(' ')[0] ?? 'Tu vecino';
  const abrir = (id: number) => router.push({ pathname: '/aviso/[id]', params: { id: String(id) } });
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
              onPress={() => abrir(s.id_producto)}
            />
          ))}
        </Tarjeta>
      )}
      <Segmentos opciones={[{ valor: 'comunidad', texto: 'Avisos' }, { valor: 'mios', texto: mios.length ? `Mis avisos (${mios.length})` : 'Mis avisos' }]} valor={seccion} onCambio={setSeccion} />
      {seccion === 'comunidad' ? (
        <>
          <Segmentos opciones={[{ valor: 'todo', texto: 'Todo' }, { valor: 'Vendo', texto: 'Venta' }, { valor: 'Servicio', texto: 'Servicios' }, { valor: 'Busco', texto: 'Busco' }]} valor={filtro} onCambio={setFiltro} />
          {lista.length ? lista.map((p) => <TarjetaPublicacion key={p.clave} p={p} alTocar={() => abrir(p.id)} />) : <Texto v="suave">No hay avisos en esta categoría.</Texto>}
        </>
      ) : (
        <>
          <Texto v="suave">{misDisponibles} de {MAX_AVISOS_DISPONIBLES} avisos disponibles. Los vendidos o cerrados no cuentan y puedes reabrirlos cuando quieras.</Texto>
          {mios.length
            ? mios.map((p) => <TarjetaPublicacion key={p.clave} p={p} alTocar={() => abrir(p.id)} />)
            : <Texto v="suave">Aún no publicas avisos. Toca «Publicar» para vender, ofrecer un servicio o pedir algo a tus vecinos.</Texto>}
        </>
      )}
      <Texto v="chico" style={{ textAlign: 'center' }}>Para comprar o contratar, coordina directamente con tu vecino. EntreCasas no cobra ni intermedia.</Texto>
    </Pantalla>
  );
}

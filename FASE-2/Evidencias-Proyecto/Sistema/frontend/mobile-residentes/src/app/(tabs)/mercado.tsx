import { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { useConsulta } from '@/api/useConsulta';
import { usePaginado } from '@/api/usePaginado';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import type { AvisoMercado, TipoAviso } from '@/api/tipos';
import Tarjeta from '@/components/ec/Tarjeta';
import SolicitudRecibida from '@/components/ec/SolicitudRecibida';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaAviso from '@/components/ec/TarjetaAviso';

type Seccion = 'comunidad' | 'mios';
type Filtro = 'todo' | TipoAviso;
const idProducto = (a: AvisoMercado) => a.idProducto;

// Mercado vecinal (GET marketplace): ventas, servicios y pedidos entre vecinos de la misma comunidad.
// «Mis avisos» muestra también los vendidos o cerrados y los que ocultó la administración.
export default function Mercado() {
  const t = useTema();
  const { comunidad } = useSesion();
  const avisos = usePaginado(muroApi.listarAvisos, [comunidad?.idRed], 'avisos', idProducto);
  const solicitudes = useConsulta(muroApi.solicitudes, [comunidad?.idRed]);
  // Estable entre renders: useAlEnfocar la usa como dependencia
  const { recargar: recargarAvisos } = avisos;
  const { recargar: recargarSolicitudes } = solicitudes;
  const recargarTodo = useCallback(() => { recargarAvisos(); recargarSolicitudes(); }, [recargarAvisos, recargarSolicitudes]);
  useAlEnfocar(recargarTodo);
  const [seccion, setSeccion] = useState<Seccion>('comunidad');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  if (!comunidad) return null;

  const todos = avisos.items ?? [];
  const lista = todos.filter((a) => !a.esMia && !a.cerradoEn && a.estadoModeracion === 'Publicada' && (filtro === 'todo' || a.tipo === filtro));
  // Primero los disponibles, después los cerrados y al final los ocultos
  const mios = todos.filter((a) => a.esMia)
    .sort((a, b) => Number(a.estadoModeracion === 'Oculta') - Number(b.estadoModeracion === 'Oculta') || Number(!!a.cerradoEn) - Number(!!b.cerradoEn));
  const disponibles = mios.filter((a) => !a.cerradoEn && a.estadoModeracion === 'Publicada').length;
  const recibidas = solicitudes.datos?.recibidas ?? [];
  const porResponder = recibidas.filter((s) => s.estado === 'Pendiente');
  const respuestas = (solicitudes.datos?.enviadas ?? []).filter((s) => s.estado !== 'Pendiente' && !s.vista);
  const interesados = (id: number) => porResponder.filter((s) => s.aviso.idProducto === id).length;
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
          {porResponder.map((s) => (
            <SolicitudRecibida key={s.idSolicitud} s={s} conAviso onRespondida={(r) => solicitudes.setDatos((d) => ({ ...d!, recibidas: d!.recibidas.map((x) => (x.idSolicitud === r.idSolicitud ? r : x)) }))} />
          ))}
        </Tarjeta>
      )}
      {respuestas.length > 0 && (
        <Tarjeta>
          <Texto v="etiqueta">Respuestas a tus solicitudes</Texto>
          {respuestas.map((s) => {
            const autor = s.autor?.nombre?.split(' ')[0] ?? 'Tu vecino';
            return (
              <Boton
                key={s.idSolicitud} tipo={s.estado === 'Aceptada' ? 'principal' : 'secundario'} icono={s.estado === 'Aceptada' ? 'logo-whatsapp' : 'close-circle-outline'}
                texto={s.estado === 'Aceptada' ? `${autor} aceptó: ver contacto` : `${autor}: ya no está disponible`}
                onPress={() => abrir(s.aviso.idProducto)}
              />
            );
          })}
        </Tarjeta>
      )}
      <Segmentos opciones={[{ valor: 'comunidad', texto: 'Avisos' }, { valor: 'mios', texto: mios.length ? `Mis avisos (${mios.length})` : 'Mis avisos' }]} valor={seccion} onCambio={setSeccion} />

      {avisos.error ? (
        <Tarjeta>
          <Texto color={t.bad}>{avisos.error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={recargarTodo} />
        </Tarjeta>
      ) : !avisos.items ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando avisos" /> : seccion === 'comunidad' ? (
        <>
          <Segmentos opciones={[{ valor: 'todo', texto: 'Todo' }, { valor: 'Vendo', texto: 'Venta' }, { valor: 'Servicio', texto: 'Servicios' }, { valor: 'Busco', texto: 'Busco' }]} valor={filtro} onCambio={setFiltro} />
          {lista.length ? lista.map((a) => <TarjetaAviso key={a.idProducto} a={a} alTocar={() => abrir(a.idProducto)} />) : <Texto v="suave">No hay avisos en esta categoría.</Texto>}
        </>
      ) : (
        <>
          <Texto v="suave">{disponibles} de {muroApi.MAX_AVISOS_DISPONIBLES} avisos disponibles. Los vendidos o cerrados no cuentan y puedes reabrirlos cuando quieras.</Texto>
          {mios.length
            ? mios.map((a) => <TarjetaAviso key={a.idProducto} a={a} interesados={interesados(a.idProducto)} alTocar={() => abrir(a.idProducto)} />)
            : <Texto v="suave">Aún no publicas avisos. Toca «Publicar» para vender, ofrecer un servicio o pedir algo a tus vecinos.</Texto>}
        </>
      )}
      {avisos.siguiente && <Boton tipo="secundario" texto="Ver avisos anteriores" cargando={avisos.cargandoMas} onPress={avisos.cargarMas} />}
      <Texto v="chico" style={{ textAlign: 'center' }}>Para comprar o contratar, coordina directamente con tu vecino. EntreCasas no cobra ni intermedia.</Texto>
    </Pantalla>
  );
}

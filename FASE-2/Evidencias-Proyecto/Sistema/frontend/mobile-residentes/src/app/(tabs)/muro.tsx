import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { usePaginado } from '@/api/usePaginado';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import * as votacionesApi from '@/api/votaciones';
import { useConsulta } from '@/api/useConsulta';
import type { PublicacionMuro, Votacion } from '@/api/tipos';
import TarjetaVotacion, { estadoVivienda } from '@/components/ec/TarjetaVotacion';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Tarjeta from '@/components/ec/Tarjeta';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaPublicacion from '@/components/ec/TarjetaPublicacion';

type Filtro = 'todo' | 'oficial' | 'vecinos' | 'votaciones';
const idPublicacion = (p: PublicacionMuro) => p.idPublicacion;
const sinMuro = () => Promise.resolve({ publicaciones: [] as PublicacionMuro[], siguiente: null });
const sinVotaciones = () => Promise.resolve([] as Votacion[]);

// Muro de la comunidad (GET muro): comunicados y normas oficiales, mensajes de vecinos y, con su módulo, votaciones.
export default function Muro() {
  const t = useTema();
  const { comunidad, unidad, tiene } = useSesion();
  const conMuro = tiene('muro');
  const muro = usePaginado(conMuro ? muroApi.listarMuro : sinMuro, [comunidad?.idRed, conMuro], 'publicaciones', idPublicacion);
  useAlEnfocar(muro.recargar);
  const conVotaciones = tiene('votaciones');
  const votaciones = useConsulta(conVotaciones ? votacionesApi.listarVotaciones : sinVotaciones, [comunidad?.idRed, conVotaciones]);
  useAlEnfocar(votaciones.recargar);
  const [filtro, setFiltro] = useState<Filtro>(conMuro ? 'todo' : 'votaciones');
  if (!comunidad) return null;

  // Primero las abiertas (la que cierra antes arriba), después las cerradas (la más reciente arriba)
  const ordenadas = [...(votaciones.datos ?? [])].sort((a, b) => (a.estado !== b.estado ? (a.estado === 'Abierta' ? -1 : 1)
    : a.estado === 'Abierta' ? a.fechaCierre.localeCompare(b.fechaCierre) : b.fechaCierre.localeCompare(a.fechaCierre)));
  const porVotar = ordenadas.filter((v) => estadoVivienda(v, unidad?.idUnidad).puedeVotar).length;

  const todas = muro.items ?? [];
  const lista = filtro === 'oficial' ? todas.filter((p) => p.tipo !== 'Vecino') : filtro === 'vecinos' ? todas.filter((p) => p.tipo === 'Vecino') : todas;
  const opciones = [
    ...(conMuro ? [{ valor: 'todo' as const, texto: 'Todo' }, { valor: 'oficial' as const, texto: 'Oficial' }, { valor: 'vecinos' as const, texto: 'Vecinos' }] : []),
    ...(conVotaciones ? [{ valor: 'votaciones' as const, texto: porVotar ? `Votar (${porVotar})` : 'Votaciones' }] : []),
  ];

  return (
    <Pantalla
      contexto={comunidad.nombre} titulo="Muro"
      derecha={conMuro ? <Boton texto="Publicar" icono="create-outline" onPress={() => router.push('/publicar')} style={{ minHeight: 44, paddingHorizontal: 14 }} /> : undefined}
    >
      {opciones.length > 1 && <Segmentos opciones={opciones} valor={filtro} onCambio={setFiltro} />}
      {filtro === 'votaciones' ? (
        votaciones.error ? (
          <Tarjeta>
            <Texto color={t.bad}>{votaciones.error.message}</Texto>
            <Boton tipo="texto" texto="Reintentar" onPress={votaciones.recargar} />
          </Tarjeta>
        ) : !votaciones.datos ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando votaciones" />
          : ordenadas.length ? ordenadas.map((v) => <TarjetaVotacion key={v.idVotacion} v={v} />)
            : <Texto v="suave">No hay votaciones todavía.</Texto>
      ) : muro.error ? (
        <Tarjeta>
          <Texto color={t.bad}>{muro.error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={muro.recargar} />
        </Tarjeta>
      ) : !muro.items ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando el muro" /> : (
        <>
          {lista.length
            ? lista.map((p) => <TarjetaPublicacion key={p.idPublicacion} p={p} onCambio={muro.reemplazar} onEliminada={muro.quitar} />)
            : <Texto v="suave">{filtro === 'oficial' ? 'La directiva todavía no publica comunicados.' : 'Nada por aquí todavía. Toca «Publicar» para escribir a tus vecinos.'}</Texto>}
          {muro.siguiente && <Boton tipo="secundario" texto="Ver publicaciones anteriores" cargando={muro.cargandoMas} onPress={muro.cargarMas} />}
        </>
      )}
    </Pantalla>
  );
}

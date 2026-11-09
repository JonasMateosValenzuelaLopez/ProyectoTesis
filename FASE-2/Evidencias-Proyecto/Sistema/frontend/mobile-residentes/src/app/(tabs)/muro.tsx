import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { usePaginado } from '@/api/usePaginado';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import type { PublicacionMuro } from '@/api/tipos';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Tarjeta from '@/components/ec/Tarjeta';
import Segmentos from '@/components/ec/Segmentos';
import TarjetaPublicacion from '@/components/ec/TarjetaPublicacion';

type Filtro = 'todo' | 'oficial' | 'vecinos' | 'votaciones';
const idPublicacion = (p: PublicacionMuro) => p.idPublicacion;
const sinMuro = () => Promise.resolve({ publicaciones: [] as PublicacionMuro[], siguiente: null });

// Muro de la comunidad (GET muro): comunicados y normas oficiales, mensajes de vecinos y, con su módulo, votaciones.
export default function Muro() {
  const t = useTema();
  const { comunidad, tiene } = useSesion();
  const conMuro = tiene('muro');
  const muro = usePaginado(conMuro ? muroApi.listarMuro : sinMuro, [comunidad?.idRed, conMuro], 'publicaciones', idPublicacion);
  useAlEnfocar(muro.recargar);
  const [filtro, setFiltro] = useState<Filtro>(conMuro ? 'todo' : 'votaciones');
  if (!comunidad) return null;

  const todas = muro.items ?? [];
  const lista = filtro === 'oficial' ? todas.filter((p) => p.tipo !== 'Vecino') : filtro === 'vecinos' ? todas.filter((p) => p.tipo === 'Vecino') : todas;
  const opciones = [
    ...(conMuro ? [{ valor: 'todo' as const, texto: 'Todo' }, { valor: 'oficial' as const, texto: 'Oficial' }, { valor: 'vecinos' as const, texto: 'Vecinos' }] : []),
    ...(tiene('votaciones') ? [{ valor: 'votaciones' as const, texto: 'Votaciones' }] : []),
  ];

  return (
    <Pantalla
      contexto={comunidad.nombre} titulo="Muro"
      derecha={conMuro ? <Boton texto="Publicar" icono="create-outline" onPress={() => router.push('/publicar')} style={{ minHeight: 44, paddingHorizontal: 14 }} /> : undefined}
    >
      {opciones.length > 1 && <Segmentos opciones={opciones} valor={filtro} onCambio={setFiltro} />}
      {filtro === 'votaciones' ? (
        <Tarjeta>
          <Texto v="fuerte">Votaciones y encuestas</Texto>
          <Texto v="suave">Las votaciones de tu comunidad aparecerán aquí cuando esta sección se conecte con la API.</Texto>
        </Tarjeta>
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

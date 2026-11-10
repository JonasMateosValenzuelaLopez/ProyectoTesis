import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as votacionesApi from '@/api/votaciones';
import { useConsulta } from '@/api/useConsulta';
import { fecha } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';

// Libro de actas (GET actas): las que la directiva ya publicó. Los borradores no llegan a la app.
export default function Actas() {
  const t = useTema();
  const { comunidad } = useSesion();
  const { datos, error, recargar } = useConsulta(votacionesApi.listarActas, [comunidad?.idRed]);
  if (!comunidad) return null;
  // Si la persona también es de la directiva, la API le entrega los borradores: aquí solo van las publicadas
  const actas = (datos ?? []).filter((a) => a.estado === 'Publicada');
  return (
    <Hoja titulo="Libro de actas">
      {error ? (
        <>
          <Texto color={t.bad}>{error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
        </>
      ) : !datos ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando actas" />
        : actas.length === 0 ? <Texto v="suave">La directiva aún no publica actas.</Texto> : (
          <Tarjeta style={{ gap: 0 }}>
            {actas.map((a, n) => (
              <Fila
                key={a.idActa} borde={n > 0} titulo={`Acta N° ${a.numero} · ${a.tipo}`}
                detalle={`${fecha(a.fecha)} · ${a.lugar} · ${a.acuerdos.length === 1 ? '1 acuerdo' : `${a.acuerdos.length} acuerdos`}`}
                onPress={() => router.push({ pathname: '/acta/[id]', params: { id: String(a.idActa) } })}
              />
            ))}
          </Tarjeta>
        )}
    </Hoja>
  );
}

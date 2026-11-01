import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { fecha } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';

// Libro de actas: las que Secretaría ya publicó. Los borradores no llegan a la app.
export default function Actas() {
  const { comunidad, actas } = useApp();
  if (!comunidad) return null;
  return (
    <Hoja titulo="Libro de actas">
      {actas.length === 0
        ? <Texto v="suave">Secretaría aún no publica actas.</Texto>
        : (
          <Tarjeta style={{ gap: 0 }}>
            {actas.map((a, n) => (
              <Fila
                key={a.id_acta} borde={n > 0} titulo={`Acta N° ${a.numero} · ${a.tipo}`}
                detalle={`${fecha(a.fecha)}${a.lugar ? ` · ${a.lugar}` : ''} · ${a.acuerdos.length === 1 ? '1 acuerdo' : `${a.acuerdos.length} acuerdos`}`}
                onPress={() => router.push({ pathname: '/acta/[id]', params: { id: String(a.id_acta) } })}
              />
            ))}
          </Tarjeta>
        )}
    </Hoja>
  );
}

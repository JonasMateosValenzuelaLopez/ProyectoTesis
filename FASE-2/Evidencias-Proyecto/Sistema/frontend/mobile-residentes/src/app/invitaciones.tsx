import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { cuando, horaMinuto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Fila from '@/components/ec/Fila';
import Chip from '@/components/ec/Chip';

// Todas las invitaciones de la vivienda: las vigentes arriba y el historial abajo.
export default function Invitaciones() {
  const { misInvitaciones } = useApp();
  const ahora = new Date();
  const vigentes = misInvitaciones.filter((i) => (i.estado === 'esperada' || i.estado === 'adentro') && new Date(i.hasta) > ahora).sort((a, b) => a.desde.localeCompare(b.desde));
  const pasadas = misInvitaciones.filter((i) => !vigentes.includes(i)).sort((a, b) => b.desde.localeCompare(a.desde));
  const fila = (i: (typeof misInvitaciones)[number], n: number, vigente: boolean) => (
    <Fila
      key={i.id} borde={n > 0} titulo={i.visitante} detalle={`${cuando(i.desde)}, ${horaMinuto(i.desde)} a ${horaMinuto(i.hasta)}`}
      derecha={vigente ? <Chip texto={i.estado === 'adentro' ? 'Ingresó' : i.codigo} tono={i.estado === 'adentro' ? 'ok' : 'senal'} codigo={i.estado !== 'adentro'} /> : <Chip texto={i.estado === 'cancelada' ? 'Cancelada' : i.estado === 'salio' ? 'Salió' : 'Vencida'} />}
      onPress={() => router.push({ pathname: '/invitacion/[id]', params: { id: i.id } })}
    />
  );
  return (
    <Hoja titulo="Mis invitaciones" abajo={<Boton tipo="senal" icono="qr-code" texto="Invitar visita" onPress={() => router.push('/invitar')} />}>
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>Vigentes</Texto>
        {vigentes.length === 0 ? <Texto v="suave">No tienes invitaciones vigentes. Crea una abajo y tu visita mostrará el código en portería.</Texto> : vigentes.map((i, n) => fila(i, n, true))}
      </Tarjeta>
      {pasadas.length > 0 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Anteriores</Texto>
          {pasadas.map((i, n) => fila(i, n, false))}
        </Tarjeta>
      )}
    </Hoja>
  );
}

import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { cuando, horaMinuto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Fila from '@/components/ec/Fila';
import Chip from '@/components/ec/Chip';

// Las invitaciones de la vivienda que esta persona puede ver (las creadas desde que llegó a vivir ahí):
// las vigentes arriba y el historial abajo. El código solo lo ve quien invitó.
export default function Invitaciones() {
  const { misInvitaciones, tiene } = useApp();
  const vigentes = misInvitaciones.filter((i) => (i.estado === 'Esperada' && !i.vencida) || i.estado === 'Adentro').sort((a, b) => a.fecha_desde.localeCompare(b.fecha_desde));
  const pasadas = misInvitaciones.filter((i) => !vigentes.includes(i)).sort((a, b) => b.fecha_desde.localeCompare(a.fecha_desde));
  const fila = (i: (typeof misInvitaciones)[number], n: number, vigente: boolean) => (
    <Fila
      key={i.id_invitacion} borde={n > 0} titulo={i.visitante}
      detalle={`${cuando(i.fecha_desde)}, ${horaMinuto(i.fecha_desde)} a ${horaMinuto(i.fecha_hasta)}${i.creador ? '' : ` · invitó ${i.invitadaPor}`}`}
      derecha={!vigente ? <Chip texto={i.estado === 'Cancelada' || i.estado === 'Salió' ? i.estado : 'Vencida'} />
        : i.estado === 'Adentro' ? <Chip texto="Ingresó" tono="ok" />
          : i.codigo ? <Chip texto={i.codigo} tono="senal" codigo /> : <Chip texto="Esperando" tono="senal" />}
      onPress={() => router.push({ pathname: '/invitacion/[id]', params: { id: String(i.id_invitacion) } })}
    />
  );
  return (
    <Hoja titulo="Invitaciones de la vivienda" abajo={tiene('conserjeria') ? <Boton tipo="senal" icono="qr-code" texto="Invitar visita" onPress={() => router.push('/invitar')} /> : undefined}>
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>Vigentes</Texto>
        {vigentes.length === 0 ? <Texto v="suave">No hay invitaciones vigentes. Crea una abajo y tu visita mostrará el código en portería.</Texto> : vigentes.map((i, n) => fila(i, n, true))}
      </Tarjeta>
      {pasadas.length > 0 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Anteriores</Texto>
          {pasadas.map((i, n) => fila(i, n, false))}
        </Tarjeta>
      )}
      <Texto v="chico">Ves las invitaciones de tu vivienda creadas desde que llegaste a vivir aquí. El código de cada una solo lo ve quien la creó.</Texto>
    </Hoja>
  );
}

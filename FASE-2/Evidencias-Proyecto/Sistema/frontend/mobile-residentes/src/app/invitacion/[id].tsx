import { Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import { cuando, horaMinuto, nombreUnidad } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Chip, { type Tono } from '@/components/ec/Chip';

const ESTADO: Record<string, { texto: string; tono: Tono }> = {
  Esperada: { texto: 'Esperando', tono: 'senal' }, Adentro: { texto: 'Ingresó', tono: 'ok' },
  Salió: { texto: 'Ya salió', tono: 'neutro' }, Cancelada: { texto: 'Cancelada', tono: 'bad' }, vencida: { texto: 'Vencida', tono: 'neutro' },
};

// El pase de la visita: código QR grande y opciones para compartirlo.
export default function DetalleInvitacion() {
  const t = useTema();
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const { misInvitaciones, unidad, comunidad, acciones } = useApp();
  const inv = misInvitaciones.find((i) => i.id_invitacion === Number(id));
  if (!inv || !unidad || !comunidad) return <Hoja titulo="Invitación"><Texto>No encontramos esta invitación.</Texto></Hoja>;

  const vencida = inv.estado === 'Esperada' && new Date(inv.fecha_hasta) < new Date();
  const estado = ESTADO[vencida ? 'vencida' : inv.estado];
  const vigente = inv.estado === 'Esperada' && !vencida;
  const horario = `${cuando(inv.fecha_desde)}, de ${horaMinuto(inv.fecha_desde)} a ${horaMinuto(inv.fecha_hasta)}`;

  const compartir = () => Share.share({
    message: `Hola ${inv.visitante.split(' ')[0]}, te invito a ${comunidad.nombre} (${comunidad.direccion}), ${nombreUnidad(unidad)}. Puedes entrar ${horario}. Muestra este código en la entrada: ${inv.codigo}\nhttps://entrecasas.cl/pase/${inv.codigo}`,
  });

  return (
    <Hoja
      titulo={nueva ? 'Invitación lista' : 'Invitación'}
      abajo={vigente ? (
        <>
          <Boton tipo="senal" icono="share-social" texto="Compartir por WhatsApp u otra app" onPress={compartir} />
          <Boton tipo="peligro" texto="Cancelar invitación" onPress={() => acciones.cancelarInvitacion(inv.id_invitacion)} />
        </>
      ) : <Boton tipo="secundario" texto="Invitar a otra persona" onPress={() => router.replace('/invitar')} />}
    >
      <View style={{ alignItems: 'center', gap: 14, backgroundColor: t.signal, borderRadius: 20, padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', alignItems: 'center' }}>
          <Texto style={{ fontFamily: F.etiqueta, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: t.signalInk }}>Pase de {inv.tipo}</Texto>
          <Chip texto={estado.texto} tono={vigente ? 'neutro' : estado.tono} />
        </View>
        <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 14, opacity: vigente ? 1 : 0.35 }} accessible accessibilityLabel={`Código QR de ${inv.codigo}`}>
          <QRCode value={inv.codigo} size={196} color="#15202B" backgroundColor="#FFFFFF" />
        </View>
        <Texto selectable style={{ fontFamily: F.cifra, fontSize: 30, lineHeight: 34, letterSpacing: 2, color: t.signalInk }}>{inv.codigo}</Texto>
        <View style={{ alignItems: 'center' }}>
          <Texto style={{ fontFamily: F.negrita, fontSize: 18, color: t.signalInk }}>{inv.visitante}</Texto>
          <Texto style={{ color: t.signalInk, textAlign: 'center' }}>{horario}</Texto>
          {!!inv.patente && <Texto style={{ color: t.signalInk }}>Patente {inv.patente}</Texto>}
        </View>
      </View>
      <Texto v="suave">
        {vigente
          ? `Comparte el código con ${inv.visitante.split(' ')[0]}. En la entrada lo escanean o lo escriben, y te llega un aviso cuando ingrese.`
          : inv.estado === 'Cancelada' ? 'Cancelaste esta invitación: el código ya no abre la entrada.' : 'Este código ya no sirve para entrar.'}
      </Texto>
    </Hoja>
  );
}

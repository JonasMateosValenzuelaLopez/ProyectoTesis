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
// Como la API, el código (y el RUT) solo lo ve quien creó la invitación; el resto de la vivienda
// ve la visita, el horario y quién la invitó, y también puede cancelarla.
export default function DetalleInvitacion() {
  const t = useTema();
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const { misInvitaciones, unidad, comunidad, tiene, acciones } = useApp();
  const inv = misInvitaciones.find((i) => i.id_invitacion === Number(id));
  if (!inv || !unidad || !comunidad) return <Hoja titulo="Invitación"><Texto>No encontramos esta invitación.</Texto></Hoja>;

  const estado = ESTADO[inv.vencida ? 'vencida' : inv.estado];
  const vigente = inv.estado === 'Esperada' && !inv.vencida;
  const horario = `${cuando(inv.fecha_desde)}, de ${horaMinuto(inv.fecha_desde)} a ${horaMinuto(inv.fecha_hasta)}`;
  const codigo = inv.codigo;
  const nombre = inv.visitante.split(' ')[0];

  const compartir = () => codigo && Share.share({
    message: `Hola ${nombre}, te invito a ${comunidad.nombre} (${comunidad.direccion}), ${nombreUnidad(unidad)}. Puedes entrar ${horario}. Muestra este código en la entrada: ${codigo}\nhttps://entrecasas.cl/pase/${codigo}`,
  });

  return (
    <Hoja
      titulo={nueva ? 'Invitación lista' : 'Invitación'}
      abajo={vigente ? (
        <>
          {codigo && <Boton tipo="senal" icono="share-social" texto="Compartir por WhatsApp u otra app" onPress={compartir} />}
          <Boton tipo="peligro" texto="Cancelar invitación" onPress={() => acciones.cancelarInvitacion(inv.id_invitacion)} />
        </>
      ) : tiene('conserjeria') ? <Boton tipo="secundario" texto="Invitar a otra persona" onPress={() => router.replace('/invitar')} /> : undefined}
    >
      <View style={{ alignItems: 'center', gap: 14, backgroundColor: t.signal, borderRadius: 20, padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', alignItems: 'center' }}>
          <Texto style={{ fontFamily: F.etiqueta, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: t.signalInk }}>Pase de {inv.tipo}</Texto>
          <Chip texto={estado.texto} tono={vigente ? 'neutro' : estado.tono} />
        </View>
        {codigo ? (
          <>
            <View style={{ backgroundColor: '#fff', padding: 14, borderRadius: 14, opacity: vigente ? 1 : 0.35 }} accessible accessibilityLabel={`Código QR de ${codigo}`}>
              <QRCode value={codigo} size={196} color="#15202B" backgroundColor="#FFFFFF" />
            </View>
            <Texto selectable style={{ fontFamily: F.cifra, fontSize: 26, lineHeight: 32, letterSpacing: 2, color: t.signalInk }}>{codigo}</Texto>
          </>
        ) : (
          <Texto style={{ color: t.signalInk, textAlign: 'center' }}>Invitó {inv.invitadaPor}. El código solo lo ve quien creó la invitación.</Texto>
        )}
        <View style={{ alignItems: 'center' }}>
          <Texto style={{ fontFamily: F.negrita, fontSize: 18, color: t.signalInk }}>{inv.visitante}</Texto>
          <Texto style={{ color: t.signalInk, textAlign: 'center' }}>{horario}</Texto>
          {!!inv.patente && <Texto style={{ color: t.signalInk }}>Patente {inv.patente}</Texto>}
          {!!inv.rut && <Texto style={{ color: t.signalInk }}>RUT {inv.rut}</Texto>}
        </View>
      </View>
      <Texto v="suave">
        {vigente
          ? codigo ? `Comparte el código con ${nombre}. En la entrada lo escanean o lo escriben, y te llega un aviso cuando ingrese.` : `${nombre} entra con el código que le compartió ${inv.invitadaPor.split(' ')[0]}.`
          : inv.estado === 'Cancelada' ? 'Esta invitación fue cancelada: el código ya no abre la entrada.' : 'Este código ya no sirve para entrar.'}
      </Texto>
    </Hoja>
  );
}

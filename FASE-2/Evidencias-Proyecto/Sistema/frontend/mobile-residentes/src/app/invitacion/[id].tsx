import { useState } from 'react';
import { ActivityIndicator, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import * as accesos from '@/api/accesos';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { cuando, horaMinuto, nombreUnidad } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Chip, { type Tono } from '@/components/ec/Chip';

const ESTADO: Record<string, { texto: string; tono: Tono }> = {
  Esperada: { texto: 'Esperando', tono: 'senal' }, Adentro: { texto: 'Ingresó', tono: 'ok' },
  Salió: { texto: 'Ya salió', tono: 'neutro' }, Cancelada: { texto: 'Cancelada', tono: 'bad' }, Vencida: { texto: 'Vencida', tono: 'neutro' },
};

// El pase de la visita (GET invitaciones/:id): código QR grande y opciones para compartirlo.
// Como la API, el código (y el RUT) solo lo ve quien creó la invitación; el resto de la vivienda
// ve la visita, el horario y quién la invitó, y también puede cancelarla.
export default function DetalleInvitacion() {
  const t = useTema();
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const { unidad, comunidad, tiene, acciones } = useSesion();
  const { datos: inv, error, setDatos } = useConsulta(() => accesos.invitacion(Number(id)), [id]);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  if (!inv || !unidad || !comunidad) {
    return <Hoja titulo="Invitación">{error ? <Texto color={t.bad}>{error.message}</Texto> : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando la invitación" />}</Hoja>;
  }

  const estado = ESTADO[inv.estado];
  const vigente = inv.estado === 'Esperada';
  const horario = `${cuando(inv.validaDesde)}, de ${horaMinuto(inv.validaDesde)} a ${horaMinuto(inv.validaHasta)}`;
  const codigo = inv.codigo;
  const nombre = inv.nombreVisita.split(' ')[0];
  const quien = inv.invitadaPor?.nombre ?? 'otra persona de la casa';

  const compartir = () => codigo && Share.share({
    message: `Hola ${nombre}, te invito a ${comunidad.nombre}, ${nombreUnidad(unidad)}. Puedes entrar ${horario}. Muestra este código en la entrada: ${codigo}`,
  });
  const cancelar = async () => {
    setEnviando(true);
    try {
      setDatos(await accesos.cancelarInvitacion(inv.idInvitacion));
      acciones.avisar('Invitación cancelada: el código ya no abre la entrada.');
      setConfirmar(false);
    } catch (e) {
      acciones.avisar(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja
      titulo={nueva ? 'Invitación lista' : 'Invitación'}
      abajo={vigente ? (
        confirmar ? (
          <View style={{ gap: 8 }}>
            <Texto>¿Cancelar la invitación de {nombre}? El código dejará de servir.</Texto>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Boton tipo="peligro" texto="Sí, cancelar" style={{ flex: 1 }} cargando={enviando} onPress={cancelar} />
              <Boton tipo="secundario" texto="No" style={{ flex: 1 }} onPress={() => setConfirmar(false)} />
            </View>
          </View>
        ) : (
          <>
            {codigo && <Boton tipo="senal" icono="share-social" texto="Compartir por WhatsApp u otra app" onPress={compartir} />}
            <Boton tipo="peligro" texto="Cancelar invitación" onPress={() => setConfirmar(true)} />
          </>
        )
      ) : tiene('conserjeria') ? <Boton tipo="secundario" texto="Invitar a otra persona" onPress={() => router.replace('/invitar')} /> : undefined}
    >
      <View style={{ alignItems: 'center', gap: 14, backgroundColor: t.signal, borderRadius: 20, padding: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', alignItems: 'center' }}>
          <Texto style={{ fontFamily: F.etiqueta, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: t.signalInk }}>Pase de {inv.categoria}</Texto>
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
          <Texto style={{ color: t.signalInk, textAlign: 'center' }}>Invitó {quien}. El código solo lo ve quien creó la invitación.</Texto>
        )}
        <View style={{ alignItems: 'center' }}>
          <Texto style={{ fontFamily: F.negrita, fontSize: 18, color: t.signalInk }}>{inv.nombreVisita}</Texto>
          <Texto style={{ color: t.signalInk, textAlign: 'center' }}>{horario}</Texto>
          {!!inv.patente && <Texto style={{ color: t.signalInk }}>Patente {inv.patente}</Texto>}
          {!!inv.rut && <Texto style={{ color: t.signalInk }}>RUT {inv.rut}</Texto>}
          {inv.ingresoEn && <Texto style={{ color: t.signalInk }}>Ingresó a las {horaMinuto(inv.ingresoEn)}{inv.salidaEn ? ` · salió a las ${horaMinuto(inv.salidaEn)}` : ''}</Texto>}
        </View>
      </View>
      <Texto v="suave">
        {vigente
          ? codigo ? `Comparte el código con ${nombre}. En la entrada lo escanean o lo escriben.` : `${nombre} entra con el código que le compartió ${quien.split(' ')[0]}.`
          : inv.estado === 'Cancelada' ? 'Esta invitación fue cancelada: el código ya no abre la entrada.' : 'Este código ya no sirve para entrar.'}
      </Texto>
    </Hoja>
  );
}

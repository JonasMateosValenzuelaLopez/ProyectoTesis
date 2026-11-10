import { useState } from 'react';
import { View } from 'react-native';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as muroApi from '@/api/muro';
import { mensajeDe } from '@/api/cliente';
import type { SolicitudRecibida as Solicitud } from '@/api/tipos';
import { hace } from '@/utils/formato';
import Texto from './Texto';
import Boton from './Boton';
import PlacaUnidad from './PlacaUnidad';

// Un vecino que pidió contacto por uno de mis avisos (POST marketplace/solicitudes/:id/respuesta).
// Aceptar le comparte mi teléfono; rechazar le avisa que el aviso ya no está disponible.
export default function SolicitudRecibida({ s, conAviso = false, borde = true, onRespondida }: {
  s: Solicitud; conAviso?: boolean; borde?: boolean; onRespondida: (s: Solicitud) => void;
}) {
  const t = useTema();
  const { acciones } = useSesion();
  const [enviando, setEnviando] = useState<'si' | 'no' | null>(null);
  const completo = s.interesado?.nombre ?? 'Un vecino';
  const nombre = completo.split(' ')[0];
  const responder = async (aceptada: boolean) => {
    setEnviando(aceptada ? 'si' : 'no');
    try {
      const r = await muroApi.responderSolicitud(s.idSolicitud, aceptada);
      acciones.avisar(aceptada ? `Listo: ${nombre} ya tiene tu teléfono.` : `Le avisamos a ${nombre} que no está disponible.`);
      onRespondida(r);
    } catch (e) {
      acciones.avisar(mensajeDe(e));
    } finally {
      setEnviando(null);
    }
  };
  return (
    <View style={{ gap: 10, paddingTop: borde ? 12 : 0, borderTopWidth: borde ? 1 : 0, borderColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {s.unidad && <PlacaUnidad tipo="" numero={s.unidad.numeroIdentificador} size="sm" />}
        <View style={{ flex: 1 }}>
          <Texto v="fuerte">{completo}</Texto>
          <Texto v="chico">{hace(s.fecha)}</Texto>
        </View>
      </View>
      {conAviso && <Texto v="suave">Le interesa «{s.aviso.titulo}».</Texto>}
      {s.estado === 'Pendiente' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton texto="Aceptar" icono="checkmark" style={{ flex: 1 }} cargando={enviando === 'si'} disabled={!!enviando} onPress={() => responder(true)} accessibilityLabel={`Aceptar a ${completo}`} />
          <Boton tipo="secundario" texto="Rechazar" style={{ flex: 1 }} cargando={enviando === 'no'} disabled={!!enviando} onPress={() => responder(false)} accessibilityLabel={`Rechazar a ${completo}`} />
        </View>
      ) : (
        <Texto v="chico" color={s.estado === 'Aceptada' ? t.ok : t.ink2}>
          {s.estado === 'Aceptada' ? `Aceptaste. ${nombre} ya tiene tu teléfono.` : `Rechazaste. Le avisamos a ${nombre} que no está disponible.`}
        </Texto>
      )}
    </View>
  );
}

import { View } from 'react-native';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { UNIDADES, type SolicitudContacto } from '@/data/demo';
import { hace, nombreUnidad } from '@/utils/formato';
import Texto from './Texto';
import Boton from './Boton';
import PlacaUnidad from './PlacaUnidad';

// Un vecino que pidió contacto por uno de mis avisos. Aceptar le comparte mi teléfono;
// rechazar le avisa que el aviso ya no está disponible. `aviso` muestra a qué aviso se refiere.
export default function SolicitudRecibida({ s, aviso, borde = true }: { s: SolicitudContacto; aviso?: string; borde?: boolean }) {
  const t = useTema();
  const { acciones, nombreDe } = useApp();
  const u = s.id_unidad ? UNIDADES[s.id_unidad] : undefined;
  const completo = nombreDe(s.id_usuario);
  const nombre = completo.split(' ')[0];
  return (
    <View style={{ gap: 10, paddingTop: borde ? 12 : 0, borderTopWidth: borde ? 1 : 0, borderColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {u && <PlacaUnidad tipo="" numero={u.numero_identificador} size="sm" />}
        <View style={{ flex: 1 }}>
          <Texto v="fuerte">{completo}</Texto>
          <Texto v="chico">{nombreUnidad(u)} · {hace(s.fecha_solicitud)}</Texto>
        </View>
      </View>
      {!!aviso && <Texto v="suave">Le interesa «{aviso}».</Texto>}
      {s.estado === 'Pendiente' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton texto="Aceptar" icono="checkmark" style={{ flex: 1 }} onPress={() => acciones.responderSolicitud(s.id_solicitud, true)} accessibilityLabel={`Aceptar a ${completo}`} />
          <Boton tipo="secundario" texto="Rechazar" style={{ flex: 1 }} onPress={() => acciones.responderSolicitud(s.id_solicitud, false)} accessibilityLabel={`Rechazar a ${completo}`} />
        </View>
      ) : (
        <Texto v="chico" color={s.estado === 'Aceptada' ? t.ok : t.ink2}>
          {s.estado === 'Aceptada' ? `Aceptaste. ${nombre} ya tiene tu teléfono.` : `Rechazaste. Le avisamos a ${nombre} que no está disponible.`}
        </Texto>
      )}
    </View>
  );
}

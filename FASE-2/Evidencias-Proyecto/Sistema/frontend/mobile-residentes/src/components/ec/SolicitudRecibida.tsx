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
  const { acciones } = useApp();
  const u = UNIDADES[s.idUnidad];
  const nombre = s.nombre.split(' ')[0];
  return (
    <View style={{ gap: 10, paddingTop: borde ? 12 : 0, borderTopWidth: borde ? 1 : 0, borderColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {u && <PlacaUnidad tipo="" numero={u.numero} size="sm" />}
        <View style={{ flex: 1 }}>
          <Texto v="fuerte">{s.nombre}</Texto>
          <Texto v="chico">{nombreUnidad(u)} · {hace(s.fecha)}</Texto>
        </View>
      </View>
      {!!aviso && <Texto v="suave">Le interesa «{aviso}».</Texto>}
      {s.estado === 'pendiente' ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Boton texto="Aceptar" icono="checkmark" style={{ flex: 1 }} onPress={() => acciones.responderSolicitud(s.id, true)} accessibilityLabel={`Aceptar a ${s.nombre}`} />
          <Boton tipo="secundario" texto="Rechazar" style={{ flex: 1 }} onPress={() => acciones.responderSolicitud(s.id, false)} accessibilityLabel={`Rechazar a ${s.nombre}`} />
        </View>
      ) : (
        <Texto v="chico" color={s.estado === 'aceptada' ? t.ok : t.ink2}>
          {s.estado === 'aceptada' ? `Aceptaste. ${nombre} ya tiene tu teléfono.` : `Rechazaste. Le avisamos a ${nombre} que no está disponible.`}
        </Texto>
      )}
    </View>
  );
}

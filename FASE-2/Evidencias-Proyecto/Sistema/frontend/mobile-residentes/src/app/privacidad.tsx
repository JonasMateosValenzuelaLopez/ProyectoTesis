import { Linking, View } from 'react-native';
import { useTema } from '@/constants/tema';
import { CORREO_PRIVACIDAD, SECCIONES_PRIVACIDAD, VERSION_PRIVACIDAD } from '@/constants/privacidad';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';

// Política de privacidad (se abre sin sesión desde «Solicitar acceso» y desde Perfil).
export default function Privacidad() {
  const t = useTema();
  return (
    <Hoja titulo="Política de privacidad">
      <Texto v="chico">Versión {VERSION_PRIVACIDAD}</Texto>
      {SECCIONES_PRIVACIDAD.map((s) => (
        <Tarjeta key={s.titulo}>
          <Texto v="subtitulo" accessibilityRole="header">{s.titulo}</Texto>
          {(s.lista ?? []).map((x) => (
            <View key={x} style={{ flexDirection: 'row', gap: 8 }}>
              <Texto v="suave">•</Texto>
              <Texto v="suave" style={{ flex: 1 }}>{x}</Texto>
            </View>
          ))}
          {(s.parrafos ?? []).map((p) => <Texto key={p} v="suave">{p}</Texto>)}
        </Tarjeta>
      ))}
      <Texto v="chico">
        Dudas o solicitudes sobre tus datos:{' '}
        <Texto v="chico" color={t.accion} onPress={() => Linking.openURL(`mailto:${CORREO_PRIVACIDAD}`)} accessibilityRole="link">{CORREO_PRIVACIDAD}</Texto>
      </Texto>
    </Hoja>
  );
}

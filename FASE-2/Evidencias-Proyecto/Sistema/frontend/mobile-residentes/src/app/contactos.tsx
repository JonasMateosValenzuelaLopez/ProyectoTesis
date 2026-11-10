import { ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import * as comunidadApi from '@/api/comunidad';
import { useConsulta } from '@/api/useConsulta';
import { EMERGENCIAS } from '@/constants/comunidad';
import { useTema } from '@/constants/tema';
import { telefono } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Tarjeta from '@/components/ec/Tarjeta';
import Fila from '@/components/ec/Fila';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';

// Directorio oficial de la comunidad (GET comunidad/contactos: el residente ve los visibles), más las emergencias.
export default function Contactos() {
  const t = useTema();
  const { comunidad } = useSesion();
  const { datos, error, recargar } = useConsulta(comunidadApi.contactos, [comunidad?.idRed]);
  if (!comunidad) return null;
  const llamar = (tel: string) => Linking.openURL(`tel:${tel.replace(/\s/g, '')}`);
  const icono = <Ionicons name="call" size={20} color={t.accion} />;
  const visibles = (datos ?? []).filter((c) => c.visible);
  return (
    <Hoja titulo="Contactos">
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>{comunidad.nombre}</Texto>
        {error ? (
          <>
            <Texto color={t.bad}>{error.message}</Texto>
            <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
          </>
        ) : !datos ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando contactos" />
          : visibles.length === 0 ? <Texto v="suave">La comunidad aún no publica contactos.</Texto>
            : visibles.map((c, n) => <Fila key={c.idContacto} borde={n > 0} titulo={c.nombre} detalle={[c.detalle, c.horario, telefono(c.telefono)].filter(Boolean).join(' · ')} derecha={icono} onPress={() => llamar(c.telefono)} />)}
      </Tarjeta>
      <Tarjeta style={{ gap: 0 }}>
        <Texto v="subtitulo" style={{ marginBottom: 6 }}>Emergencias</Texto>
        {EMERGENCIAS.map((c, n) => <Fila key={c.nombre} borde={n > 0} titulo={c.nombre} detalle={c.telefono} derecha={icono} onPress={() => llamar(c.telefono)} />)}
      </Tarjeta>
    </Hoja>
  );
}

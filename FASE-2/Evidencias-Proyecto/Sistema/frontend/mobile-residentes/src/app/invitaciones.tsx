import { ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as accesos from '@/api/accesos';
import { useConsulta } from '@/api/useConsulta';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import type { Invitacion } from '@/api/tipos';
import { cuando, horaMinuto } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Fila from '@/components/ec/Fila';
import Chip from '@/components/ec/Chip';

// Las invitaciones de la vivienda elegida que esta persona puede ver (GET invitaciones: las creadas desde que
// llegó a vivir ahí): las vigentes arriba y el historial abajo. El código solo lo ve quien invitó.
export default function Invitaciones() {
  const t = useTema();
  const { comunidad, unidad, tiene } = useSesion();
  const { datos, error, recargar } = useConsulta(accesos.listarInvitaciones, [comunidad?.idRed]);
  useAlEnfocar(recargar);
  const propias = (datos?.invitaciones ?? []).filter((i) => i.unidad?.idUnidad === unidad?.idUnidad);
  const vigentes = propias.filter((i) => i.estado === 'Esperada' || i.estado === 'Adentro').sort((a, b) => a.validaDesde.localeCompare(b.validaDesde));
  const pasadas = propias.filter((i) => !vigentes.includes(i));

  const fila = (i: Invitacion, n: number) => (
    <Fila
      key={i.idInvitacion} borde={n > 0} titulo={i.nombreVisita}
      detalle={`${cuando(i.validaDesde)}, ${horaMinuto(i.validaDesde)} a ${horaMinuto(i.validaHasta)}${i.codigo ? '' : ` · invitó ${i.invitadaPor?.nombre ?? 'otra persona de la casa'}`}`}
      derecha={i.estado === 'Adentro' ? <Chip texto="Ingresó" tono="ok" />
        : i.estado !== 'Esperada' ? <Chip texto={i.estado} />
          : i.codigo ? <Chip texto={i.codigo} tono="senal" codigo /> : <Chip texto="Esperando" tono="senal" />}
      onPress={() => router.push({ pathname: '/invitacion/[id]', params: { id: String(i.idInvitacion) } })}
    />
  );

  return (
    <Hoja titulo="Invitaciones de la vivienda" abajo={tiene('conserjeria') ? <Boton tipo="senal" icono="qr-code" texto="Invitar visita" onPress={() => router.push('/invitar')} /> : undefined}>
      {error ? (
        <>
          <Texto color={t.bad}>{error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
        </>
      ) : !datos ? <ActivityIndicator color={t.accion} accessibilityLabel="Cargando invitaciones" /> : (
        <>
          <Tarjeta style={{ gap: 0 }}>
            <Texto v="subtitulo" style={{ marginBottom: 6 }}>Vigentes</Texto>
            {vigentes.length === 0
              ? <Texto v="suave">{tiene('conserjeria') ? 'No hay invitaciones vigentes. Crea una abajo y tu visita mostrará el código en portería.' : 'No hay invitaciones vigentes.'}</Texto>
              : vigentes.map(fila)}
          </Tarjeta>
          {pasadas.length > 0 && (
            <Tarjeta style={{ gap: 0 }}>
              <Texto v="subtitulo" style={{ marginBottom: 6 }}>Anteriores</Texto>
              {pasadas.map(fila)}
            </Tarjeta>
          )}
        </>
      )}
      <Texto v="chico">Ves las invitaciones de tu vivienda creadas desde que llegaste a vivir aquí. El código de cada una solo lo ve quien la creó.</Texto>
    </Hoja>
  );
}

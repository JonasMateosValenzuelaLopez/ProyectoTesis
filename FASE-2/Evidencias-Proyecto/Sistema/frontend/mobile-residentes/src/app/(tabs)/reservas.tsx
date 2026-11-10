import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as comunidadApi from '@/api/comunidad';
import * as reservasApi from '@/api/reservas';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import type { Reserva } from '@/api/tipos';
import { cuando, fecha, nombreUnidad } from '@/utils/formato';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Boton from '@/components/ec/Boton';
import Chip from '@/components/ec/Chip';
import Fila from '@/components/ec/Fila';

const ahoraLocal = () => {
  const d = new Date();
  const l = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
  return `${l.slice(0, 10)} ${l.slice(11, 16)}`;
};
const VIGENTES = ['Pendiente', 'Aprobada', 'Entregado'];

// Por qué terminó una reserva anterior
function detalleAnterior(r: Reserva) {
  if (r.estado === 'Cancelada') {
    if (!r.motivoCancelacion) return 'La cancelaste';
    if (r.motivoCancelacion === reservasApi.MOTIVO_BAJA || r.motivoCancelacion === reservasApi.MOTIVO_HORARIO) return r.motivoCancelacion;
    return `Cancelada por la administración: ${r.motivoCancelacion}`;
  }
  if (r.estado === 'Devuelto' && r.observacionesRecepcion) return `Recibido: ${r.observacionesRecepcion}`;
  return null;
}

// Espacios comunes (GET reservas/espacios) y las reservas de la vivienda (GET reservas/mias).
export default function Reservas() {
  const t = useTema();
  const { comunidad, unidad, tiene, acciones } = useSesion();
  const espacios = useConsulta(comunidadApi.espacios, [comunidad?.idRed]);
  const mias = useConsulta(reservasApi.mias, [comunidad?.idRed]);
  useAlEnfocar(mias.recargar);
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [cancelando, setCancelando] = useState(false);
  if (!comunidad || !unidad) return null;

  const cancelar = async (r: Reserva) => {
    setCancelando(true);
    try {
      await reservasApi.cancelar(r.idReserva);
      acciones.avisar(`Reserva de ${r.espacio ?? 'el espacio'} cancelada.`);
      setConfirmando(null);
      mias.recargar();
    } catch (e) {
      acciones.avisar(mensajeDe(e));
    } finally {
      setCancelando(false);
    }
  };

  const ahora = ahoraLocal();
  const propias = (mias.datos ?? []).filter((r) => r.idUnidad === unidad.idUnidad);
  const proximas = propias.filter((r) => VIGENTES.includes(r.estado) && `${r.fecha} ${r.horaFin}` > ahora)
    .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`));
  const anteriores = propias.filter((r) => !proximas.includes(r)).slice(0, 20);
  const error = espacios.error ?? mias.error;

  return (
    <Pantalla contexto={`${nombreUnidad(unidad)} · ${comunidad.nombre}`} titulo="Reservas">
      {error && (
        <Tarjeta>
          <Texto color={t.bad}>{error.message}</Texto>
          <Boton tipo="texto" texto="Reintentar" onPress={() => { espacios.recargar(); mias.recargar(); }} />
        </Tarjeta>
      )}
      {!error && (!espacios.datos || !mias.datos) && <ActivityIndicator color={t.accion} accessibilityLabel="Cargando reservas" />}

      {proximas.length > 0 && (
        <Tarjeta>
          <Texto v="subtitulo">Tus próximas reservas</Texto>
          {proximas.map((r) => (
            <View key={r.idReserva} style={{ gap: 8, paddingTop: 8, borderTopWidth: 1, borderColor: t.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Texto v="fuerte" style={{ flex: 1 }}>{r.espacio}, {cuando(r.fecha)}</Texto>
                {r.estado === 'Entregado' && <Chip texto="En uso" tono="accion" />}
              </View>
              <Texto v="suave">
                De {r.horaInicio} a {r.horaFin}{r.invitados ? ` · ${r.invitados} invitados` : ''}{tiene('conserjeria') && r.estado !== 'Entregado' ? ' · se retira en conserjería' : ''}
              </Texto>
              {r.puedeCancelar ? (
                confirmando === r.idReserva ? (
                  <View style={{ gap: 8 }}>
                    <Texto v="chico">¿Cancelar esta reserva? El horario queda libre para otros vecinos.</Texto>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Boton tipo="peligro" texto="Sí, cancelar" cargando={cancelando} onPress={() => cancelar(r)} style={{ flex: 1, minHeight: 40 }} />
                      <Boton tipo="secundario" texto="No" onPress={() => setConfirmando(null)} style={{ flex: 1, minHeight: 40 }} />
                    </View>
                  </View>
                ) : <Boton tipo="peligro" texto="Cancelar reserva" onPress={() => setConfirmando(r.idReserva)} style={{ alignSelf: 'flex-start', minHeight: 40 }} />
              ) : r.estado !== 'Entregado' && (
                <Texto v="chico" color={t.ink2}>Ya no se puede cancelar desde la app: faltan menos de {reservasApi.HORAS_PARA_CANCELAR} horas. Si necesitas cambiarla, habla con la administración.</Texto>
              )}
            </View>
          ))}
        </Tarjeta>
      )}

      {espacios.datos?.length === 0 && (
        <Tarjeta><Texto v="suave">La comunidad todavía no tiene espacios comunes para reservar.</Texto></Tarjeta>
      )}
      {(espacios.datos ?? []).map((e) => (
        <Tarjeta key={e.idEspacio}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <Texto v="subtitulo" style={{ flex: 1 }}>{e.nombre}</Texto>
            {e.capacidad != null && <Chip texto={`Hasta ${e.capacidad} personas`} />}
          </View>
          {e.descripcion && <Texto v="suave">{e.descripcion}</Texto>}
          <Texto v="chico">{e.bloques.length ? `Horarios: ${e.bloques.map((b) => `${b.horaInicio} a ${b.horaFin}`).join(' · ')}` : 'Sin horarios para reservar por ahora.'}</Texto>
          {e.bloques.length > 0 && (
            <Boton tipo="secundario" texto={`Reservar ${e.nombre.toLowerCase()}`} onPress={() => router.push({ pathname: '/reservar', params: { espacio: String(e.idEspacio) } })} />
          )}
        </Tarjeta>
      ))}

      {anteriores.length > 0 && (
        <Tarjeta style={{ gap: 0 }}>
          <Texto v="subtitulo" style={{ marginBottom: 6 }}>Anteriores</Texto>
          {anteriores.map((r, n) => {
            const malas = r.estado === 'Cancelada' || r.estado === 'Rechazada';
            return (
              <Fila
                key={r.idReserva} borde={n > 0} titulo={`${r.espacio} · ${fecha(r.fecha)}`}
                detalle={[`${r.horaInicio} a ${r.horaFin}`, detalleAnterior(r)].filter(Boolean).join(' · ')}
                derecha={<Chip texto={malas ? r.estado : 'Usada'} tono={malas ? 'bad' : 'neutro'} />}
              />
            );
          })}
        </Tarjeta>
      )}
    </Pantalla>
  );
}

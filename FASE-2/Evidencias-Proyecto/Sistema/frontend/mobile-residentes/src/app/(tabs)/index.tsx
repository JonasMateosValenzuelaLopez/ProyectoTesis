import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/context/App';
import { useTema } from '@/constants/tema';
import { clp, cuando, diasHasta, fecha, fechaLargaTexto, horaMinuto, saludo } from '@/utils/formato';
import { resumenCuenta } from '@/utils/cuenta';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import Atajo from '@/components/ec/Atajo';
import Fila from '@/components/ec/Fila';
import SelloCargo from '@/components/ec/SelloCargo';

function GastoComun() {
  const t = useTema();
  const { estado, avisoTransferencia, comunidad } = useApp();
  if (!estado) return null;
  const { actual, deudaAnterior } = estado;
  const r = resumenCuenta(estado);
  const nombreCuota = comunidad?.tipo === 'Villa' ? 'Cuota social' : 'Gastos comunes';
  return (
    <Tarjeta>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <Texto v="subtitulo">{nombreCuota} {actual.nombre.split(' ')[0].toLowerCase()}</Texto>
        <Chip texto={r.estado.texto} tono={r.estado.tono} />
      </View>
      <View>
        <Texto v="chico">{r.pagado && !deudaAnterior ? 'Pagaste' : 'Total a pagar'}</Texto>
        <Texto v="cifra" accessibilityLabel={clp(r.pagado && !deudaAnterior ? r.mes : r.total)}>{clp(r.pagado && !deudaAnterior ? r.mes : r.total)}</Texto>
      </View>
      <View>
        {actual.items.map((i, n) => (
          <View key={i.concepto} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: n ? 1 : 0, borderColor: t.line }}>
            <Texto style={{ flex: 1 }}>{i.concepto}{i.extraordinario ? <Texto v="chico"> · extraordinario</Texto> : null}</Texto>
            <Texto style={{ fontVariant: ['tabular-nums'] }}>{clp(i.monto)}</Texto>
          </View>
        ))}
        {deudaAnterior > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: t.line }}>
            <Texto v="fuerte" color={t.bad} style={{ flex: 1 }}>Deuda de meses anteriores</Texto>
            <Texto v="fuerte" color={t.bad} style={{ fontVariant: ['tabular-nums'] }}>{clp(deudaAnterior)}</Texto>
          </View>
        )}
      </View>
      {r.pagado && !deudaAnterior ? (
        <Texto v="suave">Marcado como pagado por {actual.marcadoPor} el {fecha(actual.marcadoEn!)}.</Texto>
      ) : (
        <>
          <Texto v="suave">
            Vence el {fechaLargaTexto(actual.vence)}{diasHasta(actual.vence) >= 0 ? ` (en ${diasHasta(actual.vence)} días)` : ''}. EntreCasas no recibe pagos: se transfiere a la comunidad y la administración lo marca.
          </Texto>
          {avisoTransferencia && (
            <View style={{ backgroundColor: t.cobaltSoft, borderRadius: 12, padding: 12 }}>
              <Texto>Avisaste una transferencia de {clp(avisoTransferencia.monto)} el {fecha(avisoTransferencia.fecha)}. La administración la está revisando.</Texto>
            </View>
          )}
          <Boton texto={avisoTransferencia ? 'Ver datos de transferencia' : 'Cómo pagar'} icono="card-outline" onPress={() => router.push('/transferencia')} />
        </>
      )}
      <Boton tipo="texto" texto="Ver mis pagos anteriores" onPress={() => router.push('/pagos')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, minHeight: 40 }} />
    </Tarjeta>
  );
}

// Inicio centrado en la propia vivienda: lo que debe, lo que tiene hoy y lo que la comunidad decide.
export default function Inicio() {
  const t = useTema();
  const { cuenta, unidad, comunidad, cargo, tiene, misInvitaciones, misReservas, votaciones, miVoto, publicaciones } = useApp();
  if (!cuenta || !unidad || !comunidad) return null;

  const proximasVisitas = misInvitaciones
    .filter((i) => i.estado === 'esperada' || i.estado === 'adentro')
    .filter((i) => diasHasta(i.desde) <= 1 && new Date(i.hasta) > new Date())
    .sort((a, b) => a.desde.localeCompare(b.desde));
  const proximaReserva = misReservas
    .filter((r) => r.estado === 'confirmada' && diasHasta(r.fecha) >= 0)
    .sort((a, b) => `${a.fecha}${a.desde}`.localeCompare(`${b.fecha}${b.desde}`))[0];
  const porVotar = votaciones.filter((v) => v.estado === 'abierta' && !miVoto(v.id));
  const oficial = publicaciones.filter((p) => p.oficial).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const atajos = [
    tiene('invitaciones_qr') && <Atajo key="i" senal icono="qr-code" texto="Invitar visita" onPress={() => router.push('/invitar')} />,
    tiene('reservas') && comunidad.espacios.length > 0 && <Atajo key="r" icono="calendar" texto="Reservar espacio" onPress={() => router.push('/reservar')} />,
    tiene('muro') && <Atajo key="p" icono="create" texto="Publicar" onPress={() => router.push('/publicar')} />,
  ].filter(Boolean);

  return (
    <Pantalla>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto v="suave">{comunidad.nombre}</Texto>
          <Texto v="titulo" accessibilityRole="header">{saludo()}, {cuenta.nombre}</Texto>
        </View>
        <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} />
      </View>

      {tiene('cobros') && <GastoComun />}

      {atajos.length > 0 && <View style={{ flexDirection: 'row', gap: 10 }}>{atajos}</View>}

      {porVotar.map((v) => (
        <Tarjeta key={v.id} acento={t.cobalt}>
          <View style={{ gap: 4 }}>
            <Texto v="etiqueta" color={t.cobalt}>{v.tipo === 'votacion' ? 'Votación abierta' : 'Encuesta'} · cierra {cuando(v.cierre)}</Texto>
            <Texto v="subtitulo">{v.titulo}</Texto>
          </View>
          <Boton tipo="secundario" texto={v.tipo === 'votacion' ? 'Votar' : 'Responder'} onPress={() => router.push({ pathname: '/votacion/[id]', params: { id: v.id } })} />
        </Tarjeta>
      ))}

      {tiene('invitaciones_qr') && (
        <Tarjeta>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Texto v="subtitulo">Visitas de hoy y mañana</Texto>
            <Boton tipo="texto" texto="Ver todas" onPress={() => router.push('/invitaciones')} style={{ minHeight: 36, paddingHorizontal: 0 }} />
          </View>
          {proximasVisitas.length === 0 && <Texto v="suave">No esperas visitas. Invita a alguien y comparte su código QR.</Texto>}
          {proximasVisitas.map((i, n) => (
            <Fila
              key={i.id} borde={n > 0} titulo={i.visitante}
              detalle={i.estado === 'adentro' ? 'Ya ingresó' : `${cuando(i.desde)}, de ${horaMinuto(i.desde)} a ${horaMinuto(i.hasta)}`}
              derecha={<Chip texto={i.codigo} tono="senal" />}
              onPress={() => router.push({ pathname: '/invitacion/[id]', params: { id: i.id } })}
            />
          ))}
        </Tarjeta>
      )}

      {proximaReserva && (
        <Tarjeta>
          <Texto v="etiqueta">Tu próxima reserva</Texto>
          <Texto v="subtitulo">{proximaReserva.espacio}, {cuando(proximaReserva.fecha)}</Texto>
          <Texto v="suave">De {proximaReserva.desde} a {proximaReserva.hasta}{tiene('conserjeria') ? '. Retíralo en conserjería.' : '.'}</Texto>
        </Tarjeta>
      )}

      {oficial && tiene('muro') && (
        <Tarjeta>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <SelloCargo cargo={oficial.oficial!.cargo} size={20} />
            <Texto v="etiqueta">{oficial.oficial!.tipo} oficial · {fecha(oficial.fecha)}</Texto>
          </View>
          <Texto v="subtitulo">{oficial.titulo}</Texto>
          <Texto v="suave" numberOfLines={3}>{oficial.texto}</Texto>
          <Boton tipo="texto" texto="Ir al muro" onPress={() => router.push('/(tabs)/muro')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, minHeight: 36 }} />
        </Tarjeta>
      )}

      {cargo && (
        <Texto v="chico" style={{ textAlign: 'center' }}>Tus herramientas de cargo están en el panel web.</Texto>
      )}
    </Pantalla>
  );
}

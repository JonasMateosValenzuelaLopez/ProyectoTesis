import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import { clp, cuando, diasHasta, fecha, fechaLargaTexto, horaMinuto, saludo } from '@/utils/formato';
import { resumenCuenta } from '@/utils/cuenta';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import Fila from '@/components/ec/Fila';
import SelloCargo from '@/components/ec/SelloCargo';

// Portada de la vivienda: la placa, el saludo y lo que debe la casa, sobre la pátina profunda.
function Portada() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const { cuenta, unidad, comunidad, estado, avisoTransferencia, tiene } = useApp();
  const [detalle, setDetalle] = useState(false);
  // El encabezado es oscuro también en tema claro: la barra de estado va en claro mientras se ve esta pantalla.
  useFocusEffect(useCallback(() => {
    setStatusBarStyle('light');
    return () => setStatusBarStyle(t.oscuro ? 'light' : 'dark');
  }, [t.oscuro]));
  if (!cuenta || !unidad || !comunidad) return null;
  const cobros = tiene('cobros') && estado;
  const r = estado ? resumenCuenta(estado) : null;
  const alDia = !!r && r.pagado && !estado?.deudaAnterior;
  const enlace = { fontFamily: F.negrita, fontSize: 15, color: t.bronzeOnSidebar };

  return (
    <View style={{ backgroundColor: t.sidebar, marginHorizontal: -16, marginTop: -(insets.top + 12), paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <PlacaUnidad tipo={unidad.tipo} numero={unidad.numero} size="lg" />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto style={{ color: t.sidebarInk }}>{comunidad.nombre}</Texto>
          <Texto v="titulo" accessibilityRole="header" style={{ color: '#fff', fontSize: 24, lineHeight: 28 }}>{saludo()}, {cuenta.nombre}</Texto>
        </View>
      </View>

      {cobros && r && estado && (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Texto style={{ color: t.sidebarInk, flex: 1 }}>
                {alDia ? `Pagaste ${estado.actual.nombre.split(' ')[0].toLowerCase()}` : `Vence el ${fechaLargaTexto(estado.actual.vence)}`}
              </Texto>
              <Chip texto={r.estado.texto} tono={r.estado.tono} />
            </View>
            <Texto v="cifra" accessibilityLabel={clp(alDia ? r.mes : r.total)} style={{ color: '#fff', fontSize: 44, lineHeight: 50 }}>{clp(alDia ? r.mes : r.total)}</Texto>
          </View>

          {detalle && (
            <View>
              {estado.actual.items.map((i) => (
                <View key={i.concepto} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: t.sidebarActive }}>
                  <Texto style={{ flex: 1, color: t.sidebarInk }}>{i.concepto}{i.extraordinario ? ' · extraordinario' : ''}</Texto>
                  <Texto style={{ fontFamily: F.numero, fontVariant: ['tabular-nums'], color: '#fff' }}>{clp(i.monto)}</Texto>
                </View>
              ))}
              {estado.deudaAnterior > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: t.sidebarActive }}>
                  <Texto v="fuerte" style={{ flex: 1, color: '#fff' }}>Deuda de meses anteriores</Texto>
                  <Texto v="fuerte" style={{ fontFamily: F.etiqueta, fontVariant: ['tabular-nums'], color: '#fff' }}>{clp(estado.deudaAnterior)}</Texto>
                </View>
              )}
              <Texto style={{ color: t.sidebarMuted, fontSize: 14, lineHeight: 20, paddingTop: 8 }}>
                {alDia
                  ? `Marcado como pagado por ${estado.actual.marcadoPor} el ${fecha(estado.actual.marcadoEn!)}.`
                  : `${diasHasta(estado.actual.vence) >= 0 ? `Quedan ${diasHasta(estado.actual.vence)} días. ` : ''}EntreCasas no recibe pagos: se transfiere a la comunidad y la administración lo marca.`}
              </Texto>
            </View>
          )}

          {!alDia && avisoTransferencia && (
            <Texto style={{ color: t.sidebarInk }}>Avisaste una transferencia de {clp(avisoTransferencia.monto)} el {fecha(avisoTransferencia.fecha)}. La administración la está revisando.</Texto>
          )}
          {!alDia && <Boton tipo="portada" texto={avisoTransferencia ? 'Ver datos de transferencia' : 'Cómo pagar'} icono="card-outline" onPress={() => router.push('/transferencia')} />}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <Pressable onPress={() => setDetalle((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityState={{ expanded: detalle }}>
              <Texto style={enlace}>{detalle ? 'Ocultar detalle' : 'Ver detalle'}</Texto>
            </Pressable>
            <Pressable onPress={() => router.navigate('/finanzas')} hitSlop={10} accessibilityRole="link">
              <Texto style={enlace}>Ver finanzas</Texto>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// Inicio centrado en la propia vivienda: la placa y lo que debe abren la pantalla; después, los accesos, lo que la comunidad decide y las visitas.
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
  const accesos = [
    tiene('invitaciones_qr') && { clave: 'i', icono: 'qr-code' as const, titulo: 'Invitar una visita', detalle: 'Comparte un código QR para portería', ruta: '/invitar' as const },
    tiene('reservas') && comunidad.espacios.length > 0 && {
      clave: 'r', icono: 'calendar' as const, titulo: 'Reservar un espacio', ruta: '/reservar' as const,
      detalle: proximaReserva ? `Tienes el ${proximaReserva.espacio.toLowerCase()} ${cuando(proximaReserva.fecha)}, de ${proximaReserva.desde} a ${proximaReserva.hasta}` : comunidad.espacios.map((e) => e.nombre).join(', '),
    },
    tiene('muro') && { clave: 'p', icono: 'create' as const, titulo: 'Publicar en el muro', detalle: 'Avisos, ventas y búsquedas entre vecinos', ruta: '/publicar' as const },
  ].filter((a) => !!a).map((a, n) => (
    <Fila key={a.clave} borde={n > 0} izquierda={<Ionicons name={a.icono} size={22} color={t.ink} />} titulo={a.titulo} detalle={a.detalle} onPress={() => router.push(a.ruta)} />
  ));

  return (
    <Pantalla>
      <Portada />

      {accesos.length > 0 && <Tarjeta style={{ paddingVertical: 4 }}>{accesos}</Tarjeta>}

      {porVotar.map((v) => (
        <Tarjeta key={v.id} acento={t.patina}>
          <View style={{ gap: 4 }}>
            <Texto v="etiqueta" color={t.patina}>{v.tipo === 'votacion' ? 'Votación abierta' : 'Encuesta'} · cierra {cuando(v.cierre)}</Texto>
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
              derecha={<Chip texto={i.codigo} tono="senal" codigo />}
              onPress={() => router.push({ pathname: '/invitacion/[id]', params: { id: i.id } })}
            />
          ))}
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

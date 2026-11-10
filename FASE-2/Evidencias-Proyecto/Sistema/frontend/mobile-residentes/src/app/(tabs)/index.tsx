import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import { DIAS_SEMANA } from '@/constants/comunidad';
import * as comunidadApi from '@/api/comunidad';
import * as reservasApi from '@/api/reservas';
import * as votacionesApi from '@/api/votaciones';
import * as muroApi from '@/api/muro';
import * as accesos from '@/api/accesos';
import * as hogar from '@/api/hogar';
import { useConsulta } from '@/api/useConsulta';
import { useAlEnfocar } from '@/api/useAlEnfocar';
import { useMiCuenta } from '@/api/useMiCuenta';
import { ID_ROL_POR_NOMBRE, RolUsuario } from '@/api/tipos';
import { clp, cuando, diasHasta, fecha, fechaLargaTexto, horaMinuto, saludo } from '@/utils/formato';
import { FICHA, porVencer, vencimiento } from '@/utils/hogar';
import Pantalla from '@/components/ec/Pantalla';
import Texto from '@/components/ec/Texto';
import Tarjeta from '@/components/ec/Tarjeta';
import Chip from '@/components/ec/Chip';
import Boton from '@/components/ec/Boton';
import PlacaUnidad from '@/components/ec/PlacaUnidad';
import Fila from '@/components/ec/Fila';
import SelloCargo from '@/components/ec/SelloCargo';
import Seccion from '@/components/ec/Seccion';
import EnPorteria from '@/components/ec/EnPorteria';
import { estadoVivienda } from '@/components/ec/TarjetaVotacion';

const nada = () => Promise.resolve(null);
const VIGENTES = ['Pendiente', 'Aprobada', 'Entregado'];

// Portada de la vivienda: la placa, el saludo y lo que debe la casa (GET finanzas/mi-cuenta), sobre el color del menú.
function Portada() {
  const t = useTema();
  const insets = useSafeAreaInsets();
  const { perfil, unidad, comunidad, tiene } = useSesion();
  const conCobros = tiene('cobros');
  const { cuenta } = useMiCuenta();
  const [detalle, setDetalle] = useState(false);
  if (!perfil || !unidad || !comunidad) return null;

  const porPagar = (cuenta?.cobros ?? []).filter((c) => c.estado === 'Pendiente');
  const avisado = porPagar.flatMap((c) => c.avisos.filter((a) => a.estado === 'Pendiente')).reduce((s, a) => s + a.monto, 0);
  const proximo = porPagar.filter((c) => !c.atrasado).sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0];
  const alDia = !!cuenta && cuenta.total === 0;
  const resumen = !cuenta ? null : alDia ? { texto: 'Al día', tono: 'ok' as const }
    : cuenta.deudaAtrasada > 0 ? { texto: 'Con deuda', tono: 'bad' as const } : { texto: 'Pendiente', tono: 'warn' as const };
  const enlace = { fontFamily: F.negrita, fontSize: 15, color: t.bronzeOnSidebar };

  return (
    <View style={{ backgroundColor: t.sidebar, marginHorizontal: -16, marginTop: -(insets.top + 12), paddingTop: insets.top + 24, paddingHorizontal: 20, paddingBottom: 24, gap: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <PlacaUnidad tipo={unidad.tipoUnidad} numero={unidad.numeroIdentificador} size="lg" />
        <View style={{ flex: 1, gap: 2 }}>
          <Texto style={{ color: t.sidebarInk }}>{comunidad.nombre}</Texto>
          <Texto v="titulo" accessibilityRole="header" style={{ color: t.sidebarStrong, fontSize: 24, lineHeight: 28 }}>{saludo()}, {perfil.nombre}</Texto>
        </View>
      </View>

      {conCobros && cuenta && resumen && (
        <View style={{ gap: 16 }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Texto style={{ color: t.sidebarInk, flex: 1 }}>
                {alDia ? 'No tienes cobros pendientes' : proximo ? `«${proximo.concepto}» vence el ${fechaLargaTexto(proximo.fechaVencimiento)}` : 'Tienes cobros vencidos'}
              </Texto>
              <Chip texto={resumen.texto} tono={resumen.tono} />
            </View>
            <Texto v="cifra" accessibilityLabel={clp(cuenta.total)} style={{ color: t.sidebarStrong, fontSize: 44, lineHeight: 50 }}>{clp(cuenta.total)}</Texto>
          </View>

          {detalle && (
            <View>
              {porPagar.map((c) => (
                <View key={c.idCobroUnidad} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderColor: t.sidebarActive }}>
                  <Texto style={{ flex: 1, color: t.sidebarInk }}>{c.concepto}{c.atrasado ? ' · vencido' : ''}</Texto>
                  <Texto style={{ fontFamily: F.numero, fontVariant: ['tabular-nums'], color: t.sidebarStrong }}>{clp(c.monto)}</Texto>
                </View>
              ))}
              <Texto style={{ color: t.sidebarMuted, fontSize: 14, lineHeight: 20, paddingTop: 8 }}>
                {alDia ? 'Sin cobros pendientes.' : `${proximo && diasHasta(proximo.fechaVencimiento) >= 0 ? `Quedan ${diasHasta(proximo.fechaVencimiento)} días. ` : ''}EntreCasas no recibe pagos: se transfiere a la comunidad y la administración lo marca.`}
              </Texto>
            </View>
          )}

          {!alDia && avisado > 0 && (
            <Texto style={{ color: t.sidebarInk }}>Avisaste una transferencia de {clp(avisado)}. La administración la está revisando.</Texto>
          )}
          {!alDia && <Boton tipo="portada" texto={avisado ? 'Ver datos de transferencia' : 'Cómo pagar'} icono="card-outline" onPress={() => router.push('/transferencia')} />}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            {!alDia ? (
              <Pressable onPress={() => setDetalle((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityState={{ expanded: detalle }}>
                <Texto style={enlace}>{detalle ? 'Ocultar detalle' : 'Ver detalle'}</Texto>
              </Pressable>
            ) : <View />}
            <Pressable onPress={() => router.navigate('/finanzas')} hitSlop={10} accessibilityRole="link">
              <Texto style={enlace}>Ver finanzas</Texto>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// Lo que toca hoy o pronto: el camión de la basura (guía de bienvenida) y lo que vence en Mi hogar
function ParaHoy() {
  const t = useTema();
  const { comunidad, unidad } = useSesion();
  const guia = useConsulta(comunidadApi.guia, [comunidad?.idRed]);
  const fichas = useConsulta(() => (unidad ? hogar.listarFichas(unidad.idUnidad) : Promise.resolve([])), [unidad?.idUnidad]);
  useAlEnfocar(fichas.recargar);
  const hoy = DIAS_SEMANA[(new Date().getDay() + 6) % 7];
  const g = guia.datos;
  const basuraHoy = !!g && g.basuraDias.includes(hoy);
  const urgentes = porVencer(fichas.datos ?? []).slice(0, 2);
  if (!basuraHoy && !urgentes.length) return null;
  return (
    <Seccion titulo="Para tener en cuenta" icono="time" orden={0}>
      {basuraHoy && g && (
        <Tarjeta style={{ backgroundColor: t.patinaSoft, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.patina, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="trash-outline" size={20} color={t.oscuro ? t.paper : '#FFFFFF'} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto v="fuerte">Hoy pasa el camión de la basura</Texto>
            <Texto v="chico">{[g.basuraHorario, g.basuraLugar].filter(Boolean).join(' · ') || 'Revisa la guía de bienvenida'}</Texto>
          </View>
        </Tarjeta>
      )}
      {urgentes.length > 0 && (
        <Tarjeta style={{ paddingVertical: 4 }}>
          {urgentes.map((f, n) => {
            const v = vencimiento(f)!;
            return (
              <Fila
                key={f.idFicha} borde={n > 0} titulo={`${f.tipo}: ${f.titulo}`} detalle={`${v.texto} · Mi hogar`}
                izquierda={<Ionicons name={FICHA[f.tipo].icono} size={22} color={v.tono === 'bad' ? t.bad : t.warn} />}
                onPress={() => router.push({ pathname: '/hogar/[id]', params: { id: String(f.idFicha) } })}
              />
            );
          })}
        </Tarjeta>
      )}
    </Seccion>
  );
}

// Inicio centrado en la propia vivienda: la placa y lo que debe abren la pantalla; después, quién espera en portería,
// los accesos, lo que la comunidad decide, las visitas y el último comunicado. Cada sección consulta solo su módulo.
export default function Inicio() {
  const t = useTema();
  const { perfil, unidad, comunidad, cargo, tiene, tutorialPendiente, guiaPendiente } = useSesion();
  const idRed = comunidad?.idRed;
  const conInvitaciones = tiene('invitaciones_qr');
  const espacios = useConsulta(tiene('reservas') ? comunidadApi.espacios : nada, [idRed, tiene('reservas')]);
  const reservas = useConsulta(tiene('reservas') ? reservasApi.mias : nada, [idRed, tiene('reservas')]);
  const votaciones = useConsulta(tiene('votaciones') ? votacionesApi.listarVotaciones : nada, [idRed, tiene('votaciones')]);
  const muro = useConsulta(tiene('muro') ? () => muroApi.listarMuro() : nada, [idRed, tiene('muro')]);
  const invitaciones = useConsulta(conInvitaciones ? accesos.listarInvitaciones : nada, [idRed, conInvitaciones]);
  useAlEnfocar(reservas.recargar);
  useAlEnfocar(votaciones.recargar);
  useAlEnfocar(invitaciones.recargar);

  // Primer ingreso: primero el tutorial de la app (una vez por persona) y después la guía de bienvenida de esta vivienda.
  useEffect(() => {
    if (tutorialPendiente) router.push('/tutorial');
    else if (guiaPendiente) router.push('/bienvenida');
  }, [tutorialPendiente, guiaPendiente, unidad?.idUnidad]);
  if (!perfil || !unidad || !comunidad) return null;

  const ahora = new Date();
  const proximasVisitas = (invitaciones.datos?.invitaciones ?? [])
    .filter((i) => i.unidad?.idUnidad === unidad.idUnidad && (i.estado === 'Esperada' || i.estado === 'Adentro'))
    .filter((i) => diasHasta(i.validaDesde) <= 1 && new Date(i.validaHasta) > ahora)
    .sort((a, b) => a.validaDesde.localeCompare(b.validaDesde));
  const proximaReserva = (reservas.datos ?? [])
    .filter((r) => r.idUnidad === unidad.idUnidad && VIGENTES.includes(r.estado) && diasHasta(r.fecha) >= 0)
    .sort((a, b) => `${a.fecha}${a.horaInicio}`.localeCompare(`${b.fecha}${b.horaInicio}`))[0];
  const porVotar = (votaciones.datos ?? []).filter((v) => estadoVivienda(v, unidad.idUnidad).puedeVotar);
  const oficial = (muro.datos?.publicaciones ?? []).find((p) => p.tipo !== 'Vecino');
  const listaEspacios = espacios.datos ?? [];

  const atajos = [
    conInvitaciones && tiene('conserjeria') && { clave: 'i', icono: 'qr-code' as const, titulo: 'Invitar una visita', detalle: 'Comparte un código QR para portería', ruta: '/invitar' as const },
    tiene('reservas') && listaEspacios.length > 0 && {
      clave: 'r', icono: 'calendar' as const, titulo: 'Reservar un espacio', ruta: '/reservar' as const,
      detalle: proximaReserva ? `Tienes ${proximaReserva.espacio?.toLowerCase() ?? 'un espacio'} ${cuando(proximaReserva.fecha)}, de ${proximaReserva.horaInicio} a ${proximaReserva.horaFin}` : listaEspacios.map((e) => e.nombre).join(', '),
    },
    tiene('muro') && { clave: 'p', icono: 'create' as const, titulo: 'Publicar en el muro', detalle: 'Avisos y conversación entre vecinos', ruta: '/publicar' as const },
  ].filter((a) => !!a).map((a, n) => (
    <Fila key={a.clave} borde={n > 0} izquierda={<Ionicons name={a.icono} size={22} color={t.ink} />} titulo={a.titulo} detalle={a.detalle} onPress={() => router.push(a.ruta)} />
  ));

  return (
    <Pantalla>
      <Portada />
      <EnPorteria />
      <ParaHoy />

      {atajos.length > 0 && (
        <Seccion titulo="Accesos rápidos" icono="flash" orden={0}>
          <Tarjeta style={{ paddingVertical: 4 }}>{atajos}</Tarjeta>
        </Seccion>
      )}

      {porVotar.length > 0 && (
        <Seccion titulo="Decisiones de la comunidad" icono="checkbox" orden={1}>
          {porVotar.map((v) => (
            <Tarjeta key={v.idVotacion} acento={t.patina}>
              <View style={{ gap: 4 }}>
                <Texto v="etiqueta" color={t.patina}>{v.tipo === 'Votación' ? 'Votación abierta' : 'Encuesta'} · cierra {cuando(v.fechaCierre)}</Texto>
                <Texto v="subtitulo">{v.titulo}</Texto>
              </View>
              <Boton tipo="secundario" texto={v.tipo === 'Votación' ? 'Votar' : 'Responder'} onPress={() => router.push({ pathname: '/votacion/[id]', params: { id: String(v.idVotacion) } })} />
            </Tarjeta>
          ))}
        </Seccion>
      )}

      {conInvitaciones && (
        <Seccion
          titulo="Visitas de hoy y mañana" icono="people" orden={2}
          derecha={<Boton tipo="texto" texto="Ver todas" onPress={() => router.push('/invitaciones')} style={{ minHeight: 36, paddingHorizontal: 0 }} />}
        >
          <Tarjeta style={{ paddingVertical: proximasVisitas.length ? 4 : 18 }}>
            {proximasVisitas.length === 0 && (
              <Texto v="suave">{tiene('conserjeria') ? 'No esperas visitas. Invita a alguien y comparte su código QR.' : 'No esperas visitas.'}</Texto>
            )}
            {proximasVisitas.map((i, n) => (
              <Fila
                key={i.idInvitacion} borde={n > 0} titulo={i.nombreVisita}
                detalle={i.estado === 'Adentro' ? 'Ya ingresó' : `${cuando(i.validaDesde)}, de ${horaMinuto(i.validaDesde)} a ${horaMinuto(i.validaHasta)}`}
                derecha={i.estado === 'Adentro' ? <Chip texto="Ingresó" tono="ok" /> : i.codigo ? <Chip texto={i.codigo} tono="senal" codigo /> : <Chip texto={`Invitó ${(i.invitadaPor?.nombre ?? 'otra persona').split(' ')[0]}`} />}
                onPress={() => router.push({ pathname: '/invitacion/[id]', params: { id: String(i.idInvitacion) } })}
              />
            ))}
          </Tarjeta>
        </Seccion>
      )}

      {oficial && (
        <Seccion titulo="Último comunicado" icono="megaphone" orden={3}>
          <Tarjeta>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SelloCargo cargo={ID_ROL_POR_NOMBRE[oficial.autor?.cargo ?? ''] ?? RolUsuario.PRESIDENTE} size={20} />
              <Texto v="etiqueta">{oficial.tipo} oficial · {fecha(oficial.fecha)}</Texto>
            </View>
            {!!oficial.titulo && <Texto v="subtitulo">{oficial.titulo}</Texto>}
            <Texto v="suave" numberOfLines={3}>{oficial.contenido}</Texto>
            <Boton tipo="texto" texto="Ir al muro" onPress={() => router.navigate('/muro')} style={{ alignSelf: 'flex-start', paddingHorizontal: 0, minHeight: 36 }} />
          </Tarjeta>
        </Seccion>
      )}

      {cargo && (
        <Texto v="chico" style={{ textAlign: 'center' }}>Tus herramientas de cargo están en el panel web.</Texto>
      )}
    </Pantalla>
  );
}
